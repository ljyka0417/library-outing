import { useAppStore } from '@/store/useAppStore';

/**
 * 화면 문구 번역.
 *
 * **번역하는 것 / 안 하는 것**
 *   버튼·제목·안내문처럼 우리가 쓴 말은 번역한다.
 *   도서관 이름, 주소, 특화 태그, 책 제목, 주변 장소 이름은 번역하지 않는다.
 *   그건 실제로 존재하는 고유명사다. 「울산종갓집도서관」을 "Ulsan Jonggatjip
 *   Library" 로 바꿔 놓으면 그 이름으로는 아무 데서도 찾을 수 없고, 택시
 *   기사에게 보여 줄 수도 없다. 외국인 이용자에게도 한글 원문이 더 쓸모 있다.
 *
 * 기계번역을 붙이지 않은 이유도 같다. 런타임에 번역 API 를 부르려면 키를
 * 앱에 넣어야 하고(이 프로젝트가 내내 피해 온 것), 도서관 이름이 엉뚱하게
 * 번역돼 나갈 위험이 있다. 우리가 쓴 문장만 사람이 옮겨 적었다.
 */

export const LANGUAGES = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

const ko = {
  tabs: { home: '홈', search: '검색', chat: '달곰이', favorites: '즐겨찾기', mypage: '마이' },

  common: {
    places: (n: number) => `${n}곳`,
    libraries: (n: number) => `도서관 ${n}곳`,
    open: '운영중',
    closed: '운영종료',
    offline: '오프라인 저장본',
    soon: '준비중',
    cancel: '취소',
    delete: '삭제',
    openIn: '바로 열기',
    walkMinutes: (n: number) => `걸어서 ${n}분`,
  },

  categories: {
    landmark: '랜드마크',
    kids: '어린이',
    language: '어학',
    music: '음악',
    art: '예술',
    history: '역사',
    nature: '자연',
    science: '과학',
    comics: '만화',
    food: '음식',
    travel: '여행',
    humanities: '인문',
  },

  regions: {
    서울: '서울', 경기: '경기', 인천: '인천', 강원: '강원', 충청: '충청',
    대전: '대전', 세종: '세종', 전라: '전라', 광주: '광주', 경상: '경상',
    대구: '대구', 울산: '울산', 부산: '부산', 제주: '제주',
  },

  home: {
    greeting: '안녕하세요!',
    headline: '어떤 도서관을\n찾고 계시나요?',
    qrTitle: '가이드북을 갖고 계신가요?',
    qrBody: '책 속 QR을 찍으면 그 도서관으로 바로 이동해요',
    categories: '주제별 도서관',
    categoriesSub: '관심 있는 주제를 골라 보세요',
    featured: '이번 주 추천 도서관',
    featuredSub: '가이드북이 고른 특별한 공간',
    seeAll: '전체보기',
    recent: '최근 본 도서관',
    staleNote: '네트워크가 불안정해 마지막으로 본 정보를 보여드리고 있어요',
    languageTitle: '언어 선택',
  },

  search: {
    placeholder: '도서관명, 지역, 주제 검색',
    allTopics: '전체 주제',
    openNow: '지금 운영중',
    nationwide: '전국',
    emptyTitle: '조건에 맞는 도서관이 없어요',
    emptyBody: '검색어나 필터를 조금 바꿔 보세요',
    errorTitle: '목록을 불러오지 못했어요',
    errorBody: '네트워크 상태를 확인한 뒤 다시 시도해 주세요',
  },

  detail: {
    landmarkBadge: '지역 대표',
    specialty: '특화',
    region: '지역',
    address: '위치',
    hours: '운영시간',
    closedDays: '휴관일',
    phone: '전화',
    homepage: '홈페이지',
    pending: '상세 정보는 준비 중이에요. 지도에서 위치를 먼저 확인해 보세요.',
    more: '상세 정보 더보기',
    less: '접기',
    mapTitle: '지도로 위치 확인',
    mapSub: '쓰시는 지도앱으로 바로 열려요',
    booksLibrary: '이 도서관에서 많이 빌린 책',
    booksLibrarySub: '실제 대출 순위',
    booksRegion: (region: string) => `${region}에서 많이 빌린 책`,
    booksRegionSub: '이 지역 도서관들의 대출 순위',
    booksTopic: '이 주제의 추천 도서',
    nearbyTitle: '도서관 주변 둘러보기',
    nearbySub: '책 읽고 나서 들르기 좋은 곳',
    checkin: '여기 다녀왔어요',
    notFoundTitle: '도서관 정보를 찾을 수 없어요',
    notFoundBody: 'QR 코드가 오래되었거나\n주소가 잘못되었을 수 있어요',
    goHome: '홈으로 가기',
  },

  nearby: {
    restaurant: '주변 맛집',
    cafe: '주변 카페',
    culture: '문화·볼거리',
    empty: '아직 정보가 없어요',
  },

  favorites: {
    title: '즐겨찾기',
    subtitle: (n: number) => `${n}곳을 저장해 두셨어요`,
    emptyTitle: '아직 즐겨찾기가 없어요',
    emptyBody: '마음에 드는 도서관의 하트를 눌러\n여기에 모아 보세요',
  },

  mypage: {
    name: '달곰이와 도서관 나들이 중',
    sub: '로그인 없이도 기록은 이 기기에 저장돼요',
    favorites: '즐겨찾기',
    visits: '방문 기록',
    recent: '최근 본 곳',
    visited: '최근 다녀온 도서관',
    settings: '설정',
    notifications: '알림 설정',
    account: '로그인 / 기기 간 동기화',
    dressUp: '달곰이 꾸미기',
    reset: '기록 전체 삭제',
    resetTitle: '기록을 모두 지울까요?',
    resetBody: '즐겨찾기, 최근 본 도서관, 방문 기록이 모두 삭제돼요. 되돌릴 수 없습니다.',
    language: '언어',
  },

  onboarding: {
    skip: '건너뛰기',
    next: '다음',
    start: '도서관 둘러보기',
    slides: [
      {
        title: '안녕! 나는 달곰이야',
        body: '전국의 도서관을 함께 다니는 친구예요.\n어떤 도서관이 있는지 같이 보러 갈까요?',
      },
      {
        title: '책에서 발견하고, QR로 자세히',
        body: '가이드북에서 마음에 드는 도서관을 찾았다면\n옆에 있는 QR 코드를 찍어 보세요.',
      },
      {
        title: '나들이 코스로 완성',
        body: '지도앱으로 길을 찾고,\n주변 맛집·카페·볼거리까지 한 번에.',
      },
    ],
  },

  chat: {
    title: '달곰이에게 물어보기',
    subtitle: '앱에 담긴 132곳 정보로 답해요',
    placeholder: '어린이 도서관 추천해줘',
    thinking: '달곰이가 찾아보는 중',
    send: '질문 보내기',
    greeting:
      '안녕하세요, 달곰이예요.\n전국 도서관 132곳을 알고 있어요. 무엇이든 물어보세요.\n\n저는 이 앱에 담긴 정보로만 답해요. 모르는 건 지어내지 않고 모른다고 말할게요.',
    koreanOnly: '',
  },
};

type Dict = typeof ko;

const en: Dict = {
  tabs: { home: 'Home', search: 'Search', chat: 'Dalgomi', favorites: 'Saved', mypage: 'Me' },

  common: {
    places: (n) => `${n}`,
    libraries: (n) => `${n} librar${n === 1 ? 'y' : 'ies'}`,
    open: 'Open',
    closed: 'Closed',
    offline: 'Saved offline',
    soon: 'Coming soon',
    cancel: 'Cancel',
    delete: 'Delete',
    openIn: 'Open',
    walkMinutes: (n) => `${n} min walk`,
  },

  categories: {
    landmark: 'Landmark',
    kids: 'Kids',
    language: 'Language',
    music: 'Music',
    art: 'Art',
    history: 'History',
    nature: 'Nature',
    science: 'Science',
    comics: 'Comics',
    food: 'Food',
    travel: 'Travel',
    humanities: 'Humanities',
  },

  regions: {
    서울: 'Seoul', 경기: 'Gyeonggi', 인천: 'Incheon', 강원: 'Gangwon',
    충청: 'Chungcheong', 대전: 'Daejeon', 세종: 'Sejong', 전라: 'Jeolla',
    광주: 'Gwangju', 경상: 'Gyeongsang', 대구: 'Daegu', 울산: 'Ulsan',
    부산: 'Busan', 제주: 'Jeju',
  },

  home: {
    greeting: 'Hello!',
    headline: 'Which library\nare you looking for?',
    qrTitle: 'Have the guidebook?',
    qrBody: 'Scan a QR code in the book to jump straight to that library',
    categories: 'Browse by theme',
    categoriesSub: 'Pick a theme you like',
    featured: 'Featured this week',
    featuredSub: 'Special places picked by the guidebook',
    seeAll: 'See all',
    recent: 'Recently viewed',
    staleNote: 'The network is unstable, so this is what you saw last time',
    languageTitle: 'Language',
  },

  search: {
    placeholder: 'Library, region, or theme',
    allTopics: 'All themes',
    openNow: 'Open now',
    nationwide: 'All regions',
    emptyTitle: 'No libraries match',
    emptyBody: 'Try changing the search or filters',
    errorTitle: "Couldn't load the list",
    errorBody: 'Check your connection and try again',
  },

  detail: {
    landmarkBadge: 'Regional icon',
    specialty: 'Specialty',
    region: 'Region',
    address: 'Address',
    hours: 'Hours',
    closedDays: 'Closed',
    phone: 'Phone',
    homepage: 'Website',
    pending: "Details aren't ready yet. Check the location on the map first.",
    more: 'More details',
    less: 'Show less',
    mapTitle: 'Open in maps',
    mapSub: 'Opens in the map app you use',
    booksLibrary: 'Most borrowed at this library',
    booksLibrarySub: 'Actual loan ranking',
    booksRegion: (region) => `Most borrowed in ${region}`,
    booksRegionSub: 'Loan ranking across libraries in this region',
    booksTopic: 'Books on this theme',
    nearbyTitle: 'Around the library',
    nearbySub: 'Good stops after reading',
    checkin: "I've been here",
    notFoundTitle: "Couldn't find this library",
    notFoundBody: 'The QR code may be out of date\nor the address may be wrong',
    goHome: 'Go home',
  },

  nearby: {
    restaurant: 'Restaurants',
    cafe: 'Cafes',
    culture: 'Culture',
    empty: 'Nothing here yet',
  },

  favorites: {
    title: 'Saved',
    subtitle: (n) => `${n} saved`,
    emptyTitle: 'Nothing saved yet',
    emptyBody: 'Tap the heart on a library\nto collect it here',
  },

  mypage: {
    name: 'Out with Dalgomi',
    sub: 'Your history stays on this device, no sign-in needed',
    favorites: 'Saved',
    visits: 'Visits',
    recent: 'Recently viewed',
    visited: 'Recently visited',
    settings: 'Settings',
    notifications: 'Notifications',
    account: 'Sign in / Sync devices',
    dressUp: 'Dress up Dalgomi',
    reset: 'Clear all history',
    resetTitle: 'Clear everything?',
    resetBody: 'Saved libraries, recent views and visits will all be deleted. This cannot be undone.',
    language: 'Language',
  },

  onboarding: {
    skip: 'Skip',
    next: 'Next',
    start: 'Browse libraries',
    slides: [
      {
        title: "Hi! I'm Dalgomi",
        body: 'A friend who tours libraries with you.\nShall we go see what is out there?',
      },
      {
        title: 'Find it in the book, scan the QR',
        body: 'Spotted a library you like in the guidebook?\nScan the QR code next to it.',
      },
      {
        title: 'Make it a day out',
        body: 'Get directions, then find food, coffee\nand things to see nearby.',
      },
    ],
  },

  chat: {
    title: 'Ask Dalgomi',
    subtitle: 'Answers from the 132 libraries in this app',
    placeholder: 'Recommend a kids library',
    thinking: 'Dalgomi is looking',
    send: 'Send question',
    greeting:
      "Hello, I'm Dalgomi.\nI know 132 libraries across Korea. Ask me anything.\n\nI answer only from what this app holds. If I don't know, I'll say so instead of making it up.",
    koreanOnly: 'Dalgomi answers in Korean for now. The library data it quotes is Korean too.',
  },
};

const DICTS: Record<Language, Dict> = { ko, en };

/** 화면에서 문구를 꺼내 쓰는 훅. 언어를 바꾸면 곧바로 다시 그려진다. */
export function useT() {
  const language = useAppStore((s) => s.language);
  return DICTS[language] ?? ko;
}

/** 훅을 쓸 수 없는 곳(스토어 바깥 등)에서 쓴다 */
export function t(language: Language): Dict {
  return DICTS[language] ?? ko;
}

/**
 * 지역 이름을 그 언어로 옮긴다.
 *
 * 도서관 이름과 달리 지역은 널리 통용되는 표기가 있어서 옮겨도 길을 잃지 않는다.
 * ("부산" ↔ "Busan" ↔ "釜山" 은 어느 쪽으로 물어도 통한다)
 */
export function localizeRegion(dict: Dict, sido: string): string {
  return (dict.regions as Record<string, string>)[sido] ?? sido;
}
