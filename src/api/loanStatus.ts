import { LOAN_PROXY_URL } from '@/config/loanProxy';

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
  const libs = [...new Set(libCodes.filter(Boolean))].slice(0, 20);
  // 같은 책의 판본 여러 개(최대 3개) — 어느 판본이든 있으면 "있음"으로 합쳐서 돌아온다
  const isbn = [...new Set(isbnList.filter((s) => /^\d{13}$/.test(s)))].slice(0, 3).join(',');
  if (!LOAN_PROXY_URL || !isbn || libs.length === 0) return null;

  const key = `where:${isbn}:${libs.join(',')}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `${LOAN_PROXY_URL.replace(/\/$/, '')}/where?isbn=${isbn}&libs=${libs.join(',')}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { results?: Record<string, LoanStatus | null> };
    const value: Record<string, LoanStatus> = {};
    for (const [lib, r] of Object.entries(body.results ?? {})) if (r) value[lib] = r;
    memo.set(key, { at: Date.now(), value });
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

export async function searchBooks(query: string): Promise<FoundBook[] | null> {
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
