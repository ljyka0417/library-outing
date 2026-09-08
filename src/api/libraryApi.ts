import type { Book, Library, LibraryFilter } from '@/types';
import { booksForLibrary } from '@/data/books.mock';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { isOpenNow } from '@/utils/openingHours';
import { delay } from './config';

/**
 * 도서관 데이터 접근 인터페이스.
 *
 * 데이터는 앱에 번들된 JSON 에서 온다. 외부 API 를 런타임에 부르지 않는다
 * (그러려면 API 키를 앱에 넣어야 하는데, 앱을 뜯으면 키가 나온다).
 * 수집은 전부 빌드 타임 스크립트가 한다 — src/api/config.ts 주석 참고.
 *
 * 화면은 오직 이 인터페이스에만 의존하므로, 나중에 자체 백엔드를 붙이더라도
 * 이 파일의 구현만 바꾸면 화면 코드는 한 줄도 안 바뀐다.
 */
export interface LibraryApi {
  list(filter?: LibraryFilter): Promise<Library[]>;
  detail(id: string): Promise<Library | null>;
  recommendedBooks(libraryId: string): Promise<Book[]>;
  /** 홈 상단 추천 섹션용 */
  featured(): Promise<Library[]>;
}

/** 검색어 매칭: 이름 / 지역 / 특화 태그 어디에 걸려도 잡히게 한다. */
function matchesKeyword(lib: Library, keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    lib.name,
    lib.address,
    lib.region.sido,
    lib.region.sigungu,
    lib.specialty,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function applyFilter(libraries: Library[], filter: LibraryFilter = {}): Library[] {
  return libraries.filter((lib) => {
    if (filter.keyword && !matchesKeyword(lib, filter.keyword)) return false;
    if (filter.category && !lib.categories.includes(filter.category)) return false;
    if (filter.sido && lib.region.sido !== filter.sido) return false;
    // 운영시간을 모르는 곳(isOpenNow === null)은 "운영중" 필터에서 제외한다.
    if (filter.openNow && isOpenNow(lib.hours) !== true) return false;
    return true;
  });
}

export const libraryApi: LibraryApi = {
  async list(filter) {
    await delay();
    return applyFilter(MOCK_LIBRARIES, filter);
  },

  async detail(id) {
    await delay();
    return MOCK_LIBRARIES.find((l) => l.id === id) ?? null;
  },

  async recommendedBooks(libraryId) {
    await delay();
    const lib = MOCK_LIBRARIES.find((l) => l.id === libraryId);
    return lib ? booksForLibrary(lib.id, lib.categories) : [];
  },

  async featured() {
    await delay();
    // 지역 대표·랜드마크 도서관을 앞세운다. 지역이 겹치지 않게 하나씩 고른다.
    const seen = new Set<string>();
    return MOCK_LIBRARIES.filter((l) => {
      if (!l.isLandmark || seen.has(l.region.sido)) return false;
      seen.add(l.region.sido);
      return true;
    }).slice(0, 8);
  },
};
