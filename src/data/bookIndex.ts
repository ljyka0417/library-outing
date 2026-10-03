import generated from './book-index.generated.json';
import type { FoundBook } from '@/api/loanStatus';

/**
 * 앱에 담아 둔 "많이 빌린 책" 목록으로 찾기 (npm run collect-book-index).
 *
 * 책으로 찾기는 먼저 여기서 찾고, 모자랄 때만 중계 서버(정보나루)에 묻는다 — 하루 500건 한도를 아끼려고.
 * 한 줄 = [제목, 지은이, ISBN들(쉼표), 대출 수, 표지(앞부분 줄임)]. 판본·권은 이미 한 권으로 묶여 있다.
 * 맞추는 법은 중계 서버 /search 와 같다: 기호·띄어쓰기를 빼고 제목에 검색어가 들어 있는지.
 */
type Row = [string, string, string, number, string?];
const DATA = generated as unknown as { _generatedAt?: string; coverPrefix: string; books: Row[] };

export const bookIndexVersion = DATA._generatedAt ?? 'none';
export const bookIndexSize = DATA.books.length;

const squash = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');

// 처음 찾을 때 한 번만 만든다 (5천여 권)
let prepared: { title: string; author: string; row: Row }[] | null = null;
function prepare() {
  if (!prepared) prepared = DATA.books.map((row) => ({ title: squash(row[0]), author: squash(row[1]), row }));
  return prepared;
}

function toFound(row: Row): FoundBook {
  const cover = row[4];
  return {
    title: row[0],
    // 정리하다 남은 "글·그림: " 같은 앞말은 뗀다
    author: row[1].replace(/^(글·그림|그림|글)\s*[:：]\s*/, ''),
    isbns: row[2].split(','),
    coverImageUrl: cover ? (cover.startsWith('http') ? cover : DATA.coverPrefix + cover) : undefined,
  };
}

/**
 * 제목(또는 지은이)에 검색어가 든 책 — 제목이 똑같은 책 → 제목이 검색어로 시작 → 제목에 들어 있음 → 지은이,
 * 같은 무리 안에서는 대출 많은 순.
 */
export function searchLocalBooks(query: string, limit = 15): FoundBook[] {
  const q = squash(query);
  if (q.length < 2) return [];
  const scored: { rank: number; loans: number; row: Row }[] = [];
  for (const b of prepare()) {
    const rank = b.title === q ? 0 : b.title.startsWith(q) ? 1 : b.title.includes(q) ? 2 : b.author.includes(q) ? 3 : -1;
    if (rank >= 0) scored.push({ rank, loans: b.row[3], row: b.row });
  }
  scored.sort((a, b) => a.rank - b.rank || b.loans - a.loans);
  return scored.slice(0, limit).map((s) => toFound(s.row));
}

// ISBN → 표지 (함께 빌린 책처럼 표지 없이 오는 책에 붙인다)
let coverByIsbn: Map<string, string> | null = null;
export function coverForIsbn(isbn: string): string | undefined {
  if (!coverByIsbn) {
    coverByIsbn = new Map();
    for (const row of DATA.books) {
      const cover = row[4];
      if (!cover) continue;
      const url = cover.startsWith('http') ? cover : DATA.coverPrefix + cover;
      for (const i of row[2].split(',')) coverByIsbn.set(i, url);
    }
  }
  return coverByIsbn.get(isbn);
}
