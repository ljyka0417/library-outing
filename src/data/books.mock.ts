import type { Book, CategoryId } from '@/types';
import generated from './books.generated.json';

/**
 * ⚠️ 샘플(mock) 데이터입니다.
 *
 * 도서관 전부에 각각 큐레이션을 붙일 수는 없으므로, **주제별**로 묶어 두고
 * 도서관의 대표 주제에 맞는 책을 보여준다. 책 제목/저자는 실존 도서지만
 * "어느 도서관이 추천했는가"는 아직 없는 정보다.
 *
 * 실 연동 시 교체 경로 두 가지
 *   1) 도서관 정보나루 "인기대출도서" API → 도서관별 실제 대출 데이터
 *   2) 도서관이 직접 등록한 큐레이션 목록 (자체 백엔드)
 * 표지 이미지는 넣지 않는다. 출판사 표지는 저작물이라 무단 사용할 수 없고,
 * 랜덤 이미지를 표지인 양 보여주는 건 더 나쁘다.
 * BookCard 가 제목·저자만으로 표지 모양 카드를 그린다.
 * (실제 표지가 필요하면 알라딘/교보 OpenAPI 로 ISBN 기반 표지를 받아올 수 있다)
 */

type Seed = [category: CategoryId, title: string, author: string];

const SEEDS: Seed[] = [
  ['landmark', '도시는 무엇으로 사는가', '유현준'],
  ['landmark', '책은 도끼다', '박웅현'],
  ['landmark', '여행의 이유', '김영하'],

  ['kids', '구름빵', '백희나'],
  ['kids', '알사탕', '백희나'],
  ['kids', '마당을 나온 암탉', '황선미'],

  ['language', '영어책 한 권 외워봤니?', '김민식'],
  ['language', 'The Old Man and the Sea', 'Ernest Hemingway'],
  ['language', 'Charlotte’s Web', 'E. B. White'],

  ['music', '음악의 기쁨', '롤랑 마뉘엘'],
  ['music', '재즈 잇 업', '남무성'],
  ['music', '아무튼, 피아노', '김겨울'],

  ['art', '다른 방식으로 보기', '존 버거'],
  ['art', '방구석 미술관', '조원재'],
  ['art', '디자인의 디자인', '하라 켄야'],

  ['history', '나의 문화유산답사기', '유홍준'],
  ['history', '한국사 편지', '박은봉'],
  ['history', '토지', '박경리'],

  ['nature', '침묵의 봄', '레이첼 카슨'],
  ['nature', '나무를 심은 사람', '장 지오노'],
  ['nature', '식물의 책', '이소영'],

  ['science', '코스모스', '칼 세이건'],
  ['science', '떨림과 울림', '김상욱'],
  ['science', '클린 코드', '로버트 C. 마틴'],

  ['comics', '미생', '윤태호'],
  ['comics', '송곳', '최규석'],
  ['comics', '영화는 두 번 시작된다', '이동진'],

  ['food', '알고 먹으면 더 맛있는 음식 상식', '이의철'],
  ['food', '수요일의 그림책', '요시타케 신스케'],
  ['food', '한식의 품격', '이용재'],

  ['travel', '바다의 뚜껑', '요시모토 바나나'],
  ['travel', '여행의 기술', '알랭 드 보통'],
  ['travel', '해변의 카프카', '무라카미 하루키'],

  ['humanities', '사피엔스', '유발 하라리'],
  ['humanities', '정의란 무엇인가', '마이클 샌델'],
  ['humanities', '총, 균, 쇠', '재레드 다이아몬드'],
];

export const MOCK_BOOKS: Book[] = SEEDS.map(([category, title, author], i) => ({
  id: `book-${i + 1}`,
  title,
  author,
  category,
}));

/** 도서관의 주제들에 맞는 추천 도서를 고른다. 최대 6권. */
export function booksForCategories(categories: CategoryId[]): Book[] {
  const picked = MOCK_BOOKS.filter((b) => categories.includes(b.category));
  return picked.slice(0, 6);
}

/* ── 실제 대출 데이터 ────────────────────────────────────────
   정보나루 인기대출도서 API 로 수집한 도서관별 실제 대출 순위.
   npm run collect-books 로 갱신한다.

   있으면 이걸 쓰고, 없는 도서관만 위의 주제별 추천으로 떨어진다.
   "이 도서관에서 사람들이 실제로 많이 빌린 책" 이 주제별 일반 추천보다
   훨씬 그 도서관다운 정보다. */

interface GeneratedBook {
  title: string;
  author?: string;
  isbn?: string;
  coverImageUrl?: string;
}

interface GeneratedEntry {
  /** library = 이 도서관의 순위, region = 이 시·도의 순위 */
  scope: 'library' | 'region';
  /** scope 가 region 일 때의 지역 이름 */
  region?: string;
  books: GeneratedBook[];
}

const loanBooks =
  (generated as { byLibrary?: Record<string, GeneratedEntry> }).byLibrary ?? {};

/**
 * 수집 시각. 화면 캐시 키에 섞어 쓴다.
 *
 * useAsync 는 AsyncStorage 에 지난 결과를 캐시해 두고 먼저 보여준다.
 * 데이터를 다시 수집하면 기기에 남은 옛 목록이 잠깐이라도 먼저 뜨는데,
 * 그게 "고쳤는데 그대로다" 로 보인다. 수집 시각이 바뀌면 캐시 키도 바뀌므로
 * 옛 캐시는 조회되지 않는다.
 */
export const loanDataVersion =
  (generated as { _generatedAt?: string })._generatedAt ?? 'none';

/** 실제 대출 순위가 있으면 그걸, 없으면 주제별 추천을 돌려준다. */
export function booksForLibrary(libraryId: string, categories: CategoryId[]): Book[] {
  const entry = loanBooks[libraryId];
  if (entry && entry.books.length > 0) {
    return entry.books.map((b, i) => ({
      id: `${libraryId}-loan-${i}`,
      title: b.title,
      author: b.author ?? '',
      coverImageUrl: b.coverImageUrl,
      // 대출 순위 기반이라 주제 분류는 도서관의 대표 주제를 따른다
      category: categories[0],
      rank: i + 1,
      rankScope: entry.scope,
      rankRegion: entry.region,
    }));
  }
  return booksForCategories(categories);
}

/** 실제 대출 데이터가 있는 도서관 수 (개발 중 현황 확인용) */
export const loanBookStatus = {
  libraryCount: Object.values(loanBooks).filter((e) => e.scope === 'library').length,
  regionCount: Object.values(loanBooks).filter((e) => e.scope === 'region').length,
  bookCount: Object.values(loanBooks).reduce((n, e) => n + e.books.length, 0),
  /** 도서관마다 목록이 실제로 다른지. 같은 목록이 돌아다니면 수집이 잘못된 것이다 */
  distinctCount: new Set(
    Object.values(loanBooks)
      .filter((e) => e.scope === 'library')
      .map((e) => e.books.map((b) => b.title).join('|'))
  ).size,
  version: loanDataVersion,
};
