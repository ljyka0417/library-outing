import generated from './region-books.generated.json';
import type { Book } from '@/types';

/**
 * 지역별 "요즘 많이 빌린 책" (정보나루, 최근 3개월). npm run collect-region-books 로 갱신.
 * 지역 이름은 가이드북 분류(서울·경기 … 충청·전라·경상 …)를 따른다.
 */
interface RegionEntry {
  books: { title: string; author?: string; isbn?: string; coverImageUrl?: string }[];
}
const REGIONS = (generated as { regions: Record<string, RegionEntry> }).regions;

/** 수집 시각 — 화면 캐시 키에 섞는다 */
export const regionBooksVersion = (generated as { _generatedAt?: string })._generatedAt ?? 'none';

export function booksForRegion(region: string): Book[] {
  return (REGIONS[region]?.books ?? []).map((b, i) => ({
    id: `region-${region}-${i}`,
    title: b.title,
    author: b.author ?? '',
    isbn: b.isbn,
    coverImageUrl: b.coverImageUrl,
    // 지역 순위라 특정 주제가 없다. 표지가 없을 때 그리는 가짜 표지 색에만 쓰인다
    category: 'humanities',
    rank: i + 1,
    rankScope: 'region',
    rankRegion: region,
  }));
}

export const regionsWithBooks = Object.keys(REGIONS);
