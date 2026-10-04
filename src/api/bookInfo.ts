import { LOAN_PROXY_URL } from '@/config/loanProxy';

/**
 * 책 소개 (카카오 책 검색, 중계 서버 /book 경유 — 카카오 키는 서버에만 있다).
 * "어디서 빌릴 수 있나요?" 판에 출판사·출간 연도·소개 글을 붙인다. 정보나루 한도와 상관없다.
 * 찾지 못했거나 실패하면 null — 화면은 그 칸을 그리지 않는다(지어내지 않는다).
 */
export interface BookInfo {
  title: string;
  authors: string[];
  translators: string[];
  publisher?: string;
  year?: string;
  /** 카카오가 주는 소개 글 앞부분(250자쯤, 문장 중간에서 끊겨 온다) */
  contents?: string;
  thumbnail?: string;
  /** 다음 책 페이지 */
  url?: string;
}

const memo = new Map<string, BookInfo | null>();

export async function fetchBookInfo(isbn: string): Promise<BookInfo | null> {
  if (!LOAN_PROXY_URL || !/^\d{13}$/.test(isbn)) return null;
  if (memo.has(isbn)) return memo.get(isbn)!;
  try {
    const res = await fetch(`${LOAN_PROXY_URL.replace(/\/$/, '')}/book?isbn=${isbn}`, {
      signal: AbortSignal.timeout?.(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as BookInfo & { found?: boolean };
    const info = body.found === false || !body.title ? null : body;
    memo.set(isbn, info);
    return info;
  } catch {
    return null;
  }
}
