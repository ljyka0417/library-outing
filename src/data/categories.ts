import type { Category } from '@/types';

/**
 * 홈 화면 주제별 그리드 (4열 × 3행 = 12분류).
 *
 * 졸업작품에 선정된 전국 132곳의 특화 태그를 전부 훑어서 다시 설계했다.
 * 원래 8분류로는 철학·웹툰·바다·점자·에너지 같은 태그가 갈 곳이 없었다.
 *
 * 설계 원칙
 *  - 도서관이 최소 3~4곳은 모이는 분류만 만든다. 1곳짜리 분류는 필터로서 쓸모가 없다.
 *  - 그래도 안 담기는 세부 태그는 Library.specialty 에 원문 그대로 남겨 화면에 노출한다.
 *    (예: '아라가야 정신', '국채보상운동', '팬기부형')
 *  - 화면에는 분류 이름만 쓴다. 한때 "음악·LP", "과학·IT" 처럼 부제를 함께
 *    찍었는데, 부제는 그 분류를 설명하는 말이 아니라 안에 든 한 예였다.
 *    음악 6곳 중 LP 는 한 곳, 과학 14곳 중 IT 는 두 곳이다. 그래서 국악
 *    도서관 카드에도 "음악·LP" 가 붙었고, LP 를 기대하고 들어온 사람은
 *    "다른 도서관이 섞였다" 고 느꼈다.
 */
export const CATEGORIES: Category[] = [
  { id: 'landmark', name: '랜드마크', icon: 'business' },
  { id: 'kids', name: '어린이', icon: 'happy' },
  { id: 'language', name: '어학', icon: 'language' },
  { id: 'music', name: '음악', icon: 'musical-notes' },
  { id: 'art', name: '예술', icon: 'color-palette' },
  { id: 'history', name: '역사', icon: 'library' },
  { id: 'nature', name: '자연', icon: 'leaf' },
  { id: 'science', name: '과학', icon: 'rocket' },
  { id: 'comics', name: '만화', icon: 'film' },
  { id: 'food', name: '음식', icon: 'restaurant' },
  { id: 'travel', name: '여행', icon: 'boat' },
  { id: 'humanities', name: '인문', icon: 'people' },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

/**
 * 지역 필터 목록.
 *
 * 가이드북의 지역 분류를 그대로 따른다. 충청·경상·전라를 북/남으로 쪼개지 않은 것은
 * 원본 분류가 그렇게 되어 있기 때문이다. 실 데이터를 붙일 때 행정구역 기준으로
 * 나눌지는 가이드북 목차와 맞춰서 결정해야 한다.
 */
export const SIDO_LIST = [
  '서울',
  '경기',
  '인천',
  '강원',
  '충청',
  '대전',
  '세종',
  '전라',
  '광주',
  '경상',
  '대구',
  '울산',
  '부산',
  '제주',
];
