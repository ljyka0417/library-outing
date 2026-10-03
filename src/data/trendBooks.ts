import generated from './trend-books.generated.json';
import type { Book } from '@/types';

/**
 * 나이대별 많이 빌린 책(최근 3개월, 전국)과 이달의 키워드 — npm run collect-trend-books 로 갱신.
 * 앱 사용 중에는 정보나루에 묻지 않는다 (하루 500건 한도).
 */
export type AgeKey = 'kids' | 'children' | 'teens' | '20s' | '30s' | '40s' | '50s' | '60s';
export type GenderKey = 'all' | 'female' | 'male';
export const AGE_KEYS: AgeKey[] = ['kids', 'children', 'teens', '20s', '30s', '40s', '50s', '60s'];
export const GENDER_KEYS: GenderKey[] = ['all', 'female', 'male'];

interface RawBook {
  title: string;
  author?: string;
  isbn?: string;
  coverImageUrl?: string;
}
const DATA = generated as {
  _generatedAt?: string;
  ages: Partial<Record<AgeKey, Partial<Record<GenderKey, RawBook[]>>>>;
  keywords: { month: string; items: { word: string; books: RawBook[] }[] };
};

export const trendBooksVersion = DATA._generatedAt ?? 'none';

const toBook = (prefix: string) => (b: RawBook, i: number): Book => ({
  id: `${prefix}-${i}`,
  title: b.title,
  author: b.author ?? '',
  isbn: b.isbn,
  coverImageUrl: b.coverImageUrl,
  // 표지가 없을 때 그리는 가짜 표지 색에만 쓰인다
  category: 'humanities',
});

export function booksForAge(age: AgeKey, gender: GenderKey): Book[] {
  return (DATA.ages[age]?.[gender] ?? []).map(toBook(`age-${age}-${gender}`));
}

/** 자료가 있는 나이대만 */
export const agesWithBooks = AGE_KEYS.filter((a) => (DATA.ages[a]?.all?.length ?? 0) > 0);

/** 이달의 키워드 — month 는 "2026-09" (키워드를 집계한 달) */
export const keywordMonth = DATA.keywords.month;
export const keywordItems = DATA.keywords.items.map((k) => ({
  word: k.word,
  books: k.books.map(toBook(`kw-${k.word}`)),
}));
