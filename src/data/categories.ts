import type { Category } from '@/types';

/**
 * 홈 화면 주제별 그리드 (13분류).
 *
 * 가이드북 『오늘 도서관 갈래?』의 특화 분류 13가지를 그대로 쓴다.
 * 책의 도서관 쪽마다 이름 위에 찍힌 특화 아이콘과 앱의 주제가 같아야,
 * 책을 보고 앱을 연 사람이 같은 도서관을 같은 주제에서 찾는다.
 * (예전 앱 분류의 역사·만화는 책에 없어 뺐고, 책에만 있던 교육을 더했다.
 *  교육은 배방월천도서관 한 곳뿐이지만 책이 그렇게 나누었으므로 따른다)
 *
 *  - 주제보다 구체적인 세부 태그는 Library.specialty 에 남겨 화면에 노출한다.
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
  { id: 'nature', name: '자연·환경', icon: 'leaf' },
  { id: 'science', name: '과학', icon: 'rocket' },
  { id: 'food', name: '음식', icon: 'restaurant' },
  { id: 'travel', name: '여행', icon: 'airplane' },
  { id: 'humanities', name: '인문', icon: 'people' },
  // Ionicons 의 hammer 는 못 박는 망치라 공사장으로 읽힌다. 판사봉은 MaterialCommunityIcons 에 있다
  { id: 'law', name: '법률', icon: 'gavel', iconFamily: 'material' },
  { id: 'media', name: '미디어', icon: 'videocam' },
  { id: 'education', name: '교육', icon: 'school' },
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
