/** 도메인 타입 정의. mock 이든 실 API 든 이 형태로 정규화해서 화면에 넘긴다. */

export type CategoryId =
  | 'landmark'
  | 'kids'
  | 'language'
  | 'music'
  | 'art'
  | 'history'
  | 'nature'
  | 'science'
  | 'comics'
  | 'food'
  | 'travel'
  | 'humanities';

export interface Category {
  id: CategoryId;
  /** 홈 그리드에 보이는 라벨. 2줄로 끊어 보여주기 위해 name/sub 로 나눈다. */
  name: string;
  sub: string;
  /** @expo/vector-icons 의 Ionicons 이름 */
  icon: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 요일별 운영시간. 문자열이 아닌 분(minute) 단위로 저장해야
 * "지금 운영중" 판정을 계산할 수 있다.
 */
export interface DayHours {
  /** 자정 기준 분. 예) 09:00 → 540 */
  open: number;
  close: number;
}

export interface OperatingHours {
  /** 0=일요일 ... 6=토요일. null 이면 그날은 휴관. */
  byDay: (DayHours | null)[];
  /** 화면에 그대로 노출할 사람이 읽는 형태의 요약 */
  label: string;
}

/**
 * 도서관.
 *
 * ⚠️ 상세 필드가 대부분 optional 인 이유
 * 실제 공공 도서관 데이터는 구멍이 많다. 정보나루 API 도 위경도가 빠진 곳이 있고,
 * 운영시간은 표준화되지 않은 자유 문자열인 경우가 흔하다. 그래서 "없을 수 있다"를
 * 타입에 명시해 두고, 화면은 없는 필드를 조용히 숨기도록 만들었다.
 * 확인되지 않은 값을 그럴듯하게 채워 넣는 것보다 비워 두는 편이 낫다.
 */
export interface Library {
  id: string;
  name: string;
  /** 한 도서관이 여러 특화 주제를 가질 수 있다 */
  categories: CategoryId[];
  region: {
    /** 가이드북의 지역 분류 (예: 서울, 경기, 충청) */
    sido: string;
    /** 시/군/구. 확인된 곳만 채운다. */
    sigungu?: string;
  };
  /** 원문 특화 태그. 분류(categories)보다 구체적이라 화면에 그대로 노출한다. */
  specialty: string;
  /** 지역 대표·랜드마크 도서관 여부 */
  isLandmark: boolean;

  address?: string;
  coords?: Coordinates;
  phone?: string;
  hours?: OperatingHours;
  /** 휴관일 안내 문구 */
  closedDays?: string;
  description?: string;
  homepage?: string;
  /** 도서관 정보나루 API 의 원본 식별자 (실 API 연동 시 매핑용) */
  sourceApiId?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  coverImageUrl?: string;
  /** 이 책이 어울리는 주제 */
  category: CategoryId;
  /** 실제 대출 순위. 주제별 일반 추천에는 없다. */
  rank?: number;
  /**
   * 그 순위가 어디를 집계한 것인지.
   *
   *   library  이 도서관의 대출 순위
   *   region   이 도서관이 있는 시·도의 대출 순위
   *
   * 정보나루에 등록되지 않은 도서관(국립·국회·대학·작은도서관 등)은
   * 자기 대출 데이터가 없다. 그럴 때 지역 순위를 대신 보여주되,
   * 화면에서 어디를 집계한 것인지 분명히 밝힌다.
   */
  rankScope?: 'library' | 'region';
  /** rankScope 가 region 일 때 그 지역 이름 */
  rankRegion?: string;
}

export type NearbyType = 'restaurant' | 'cafe' | 'culture';

export interface NearbyPlace {
  id: string;
  libraryId: string;
  type: NearbyType;
  name: string;
  /** 카테고리 세부 (예: "칼국수", "베이커리 카페", "전시관") */
  subCategory: string;
  address: string;
  coords: Coordinates;
  /** 도서관으로부터의 도보 거리(m) */
  distanceMeters: number;
  imageUrl?: string;
  /** 한 줄 소개 */
  note?: string;
}

/** 검색/목록 화면 필터 */
export interface LibraryFilter {
  keyword?: string;
  category?: CategoryId;
  sido?: string;
  /** true 면 지금 운영중인 곳만 */
  openNow?: boolean;
}

export interface VisitRecord {
  libraryId: string;
  visitedAt: string;
}
