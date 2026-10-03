import { LOAN_PROXY_URL } from '@/config/loanProxy';
import { coverForIsbn } from '@/data/bookIndex';

/** 한 권의 대출 상태. 정보나루가 답하지 않으면 그 책은 결과에 없다 */
export interface LoanStatus {
  hasBook: boolean;
  loanAvailable: boolean;
}

/** 같은 화면을 다시 열 때 또 묻지 않게 잠깐 기억해 둔다 (중계 서버도 10분 기억한다) */
const MEMO_MS = 5 * 60 * 1000;
const memo = new Map<string, { at: number; value: Record<string, LoanStatus> }>();

export const loanLookupEnabled = Boolean(LOAN_PROXY_URL);

/**
 * 이 도서관(정보나루 코드)에 이 책들이 있는지, 지금 빌릴 수 있는지.
 *
 * 실패해도 던지지 않고 빈 결과를 돌려준다 — 인터넷이 없거나 서버가 늦으면
 * 대출 표시만 조용히 빠지고 화면의 나머지는 그대로다. 틀린 상태를 보여 주느니 안 보여 준다.
 */
export async function fetchLoanStatus(libCode: string, isbns: string[]): Promise<Record<string, LoanStatus>> {
  const list = [...new Set(isbns.filter((s) => /^\d{13}$/.test(s)))].slice(0, 10);
  if (!LOAN_PROXY_URL || !libCode || list.length === 0) return {};

  const key = `${libCode}:${list.join(',')}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `${LOAN_PROXY_URL.replace(/\/$/, '')}/loan?lib=${encodeURIComponent(libCode)}&isbn=${list.join(',')}`,
      { signal: controller.signal }
    );
    if (!res.ok) return {};
    const body = (await res.json()) as { results?: Record<string, LoanStatus | null> };
    const value: Record<string, LoanStatus> = {};
    for (const [isbn, r] of Object.entries(body.results ?? {})) if (r) value[isbn] = r;
    memo.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 책 한 권을 여러 도서관에 묻는다 — "이 책 어디서 빌릴 수 있어?"
 * 돌려주는 값: 도서관 코드 → 상태. 정보나루가 답하지 않은 도서관은 빠진다.
 * 실패하면 null — 화면은 "지금은 확인할 수 없어요"를 보여 준다(빈 결과와 구별하려고).
 */
export async function fetchWhereToBorrow(
  isbnList: string[],
  libCodes: string[]
): Promise<Record<string, LoanStatus> | null> {
  const libs = [...new Set(libCodes.filter(Boolean))];
  // 같은 책의 판본 여러 개(최대 3개) — 어느 판본이든 있으면 "있음"으로 합쳐서 돌아온다
  const isbns = [...new Set(isbnList.filter((s) => /^\d{13}$/.test(s)))].slice(0, 3);
  if (!LOAN_PROXY_URL || isbns.length === 0 || libs.length === 0) return null;

  const key = `where:${isbns.join(',')}:${libs.join(',')}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value;

  /*
   * 중계 서버는 한 번에 "도서관 수 × 판본 수"를 45까지만 받는다(무료 요금제 한도).
   * 그보다 많으면(전국 80곳 등) 나눠서 한꺼번에 묻고 합친다.
   */
  const perCall = Math.max(1, Math.min(20, Math.floor(45 / isbns.length)));
  const chunks: string[][] = [];
  for (let i = 0; i < libs.length; i += perCall) chunks.push(libs.slice(i, i + perCall));

  const answers = await Promise.all(chunks.map((chunk) => whereOnce(isbns.join(','), chunk)));
  if (answers.every((a) => a === null)) return null;
  const value: Record<string, LoanStatus> = Object.assign({}, ...answers.filter(Boolean));
  // 한 곳도 답하지 않았으면 "없어요"가 아니라 "확인할 수 없어요"다 (하루 500건 한도를 넘긴 날 등)
  if (Object.keys(value).length === 0) return null;
  memo.set(key, { at: Date.now(), value });
  return value;
}

async function whereOnce(isbn: string, libs: string[]): Promise<Record<string, LoanStatus> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      `${LOAN_PROXY_URL.replace(/\/$/, '')}/where?isbn=${isbn}&libs=${libs.join(',')}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { results?: Record<string, LoanStatus | null> };
    const value: Record<string, LoanStatus> = {};
    for (const [lib, r] of Object.entries(body.results ?? {})) if (r) value[lib] = r;
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 책 제목으로 찾기 (정보나루 도서 검색, 중계 서버 경유).
 * 같은 책의 판본은 한 권으로 묶여 오고, isbns 에 판본 ISBN 이 대출 많은 순으로 들어 있다.
 * 실패하면 null — 화면은 "지금은 찾을 수 없어요"를 보여 준다.
 */
export interface FoundBook {
  title: string;
  author: string;
  coverImageUrl?: string;
  isbns: string[];
}
const searchMemo = new Map<string, FoundBook[]>();

/**
 * 정보나루는 하루 500건까지만 답한다(그 이상은 고정 IP 등록이 필요한데, Cloudflare 는 IP 가 고정이 아니다).
 * 한도를 넘긴 날은 'quota' — 화면이 "오늘 조회 한도를 다 썼어요"라고 말하게.
 */
export async function searchBooks(query: string): Promise<FoundBook[] | null | 'quota'> {
  const q = query.trim();
  if (!LOAN_PROXY_URL || q.replace(/\s/g, '').length < 2) return null;
  const hit = searchMemo.get(q);
  if (hit) return hit;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${LOAN_PROXY_URL.replace(/\/$/, '')}/search?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
    });
    if (res.status === 503) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (err.error === 'quota') return 'quota';
    }
    if (!res.ok) return null;
    const body = (await res.json()) as { books?: FoundBook[] };
    const books = (body.books ?? []).filter((b) => b.title && b.isbns?.length);
    searchMemo.set(q, books);
    return books;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 이 책을 빌린 사람들이 함께 빌린 책 (정보나루 도서별 이용 분석, 중계 서버 /related — 서버가 7일 기억한다).
 * 표지는 정보나루가 주지 않아서, 앱에 담아 둔 많이 빌린 책 목록에서 ISBN 으로 찾아 붙인다.
 */
const relatedMemo = new Map<string, FoundBook[]>();
export async function fetchRelated(isbn: string): Promise<FoundBook[] | null | 'quota'> {
  if (!LOAN_PROXY_URL || !/^\d{13}$/.test(isbn)) return null;
  const hit = relatedMemo.get(isbn);
  if (hit) return hit;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${LOAN_PROXY_URL.replace(/\/$/, '')}/related?isbn=${isbn}`, { signal: controller.signal });
    if (res.status === 503) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (err.error === 'quota') return 'quota';
    }
    if (!res.ok) return null;
    const body = (await res.json()) as { books?: FoundBook[] };
    const books = (body.books ?? [])
      .filter((b) => b.title && b.isbns?.length)
      .map((b) => ({ ...b, coverImageUrl: b.coverImageUrl ?? b.isbns.map(coverForIsbn).find(Boolean) }));
    relatedMemo.set(isbn, books);
    return books;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
