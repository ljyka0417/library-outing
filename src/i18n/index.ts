import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * 4개 국어 전환 (한국어 / 영어 / 일본어 / 중국어).
 *
 * ⚠️ 일부러 라이브러리를 하나도 쓰지 않는다.
 *   전에 유리 탭바와 다국어를 한 번에 넣었다가 앱이 켜지자마자 죽어
 *   되돌리는 데 며칠이 걸렸다. i18n 라이브러리나 expo-localization 은
 *   네이티브 쪽을 건드리기 때문에, 패키지만 깔고 네이티브를 다시 만들지
 *   않으면 자바스크립트에는 있는데 기기에는 없는 상태가 된다.
 *
 *   여기 있는 것은 전부 그냥 객체와 문자열이다. 새로 깔 것도, 다시
 *   빌드할 것도 없다. 최악의 경우에도 글자만 이상하게 나오지 앱이 죽지 않는다.
 *
 * 번역하는 것 / 안 하는 것
 *   O  화면에 우리가 직접 써 넣은 말 (탭 이름, 안내 문구, 주제 이름)
 *   X  도서관 이름 · 주소 · 특화 분야 · 책 제목
 *      이건 수집한 실제 데이터다. 옮기면 없는 이름을 지어내는 셈이 되고,
 *      현지에서 길을 물을 때도 원문이 있어야 쓸모가 있다.
 */

/* 국기는 이모지가 아니라 Flag.tsx 가 도형으로 그린다. 이모지 국기는
   윈도우와 일부 안드로이드에서 "KR", "US" 같은 글자로 나오기 때문이다. */
export const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

/** 한국어가 원본이다. 다른 말은 여기 있는 열쇠를 전부 채워야 한다. */
const ko = {
  'tab.home': '홈',
  'tab.search': '검색',
  'tab.chat': '달곰이',
  'tab.favorites': '즐겨찾기',
  'tab.mypage': '마이',

  'home.greeting': '안녕하세요!',
  'home.headline': '어떤 도서관을\n찾고 계시나요?',
  'home.qrTitle': '가이드북을 갖고 계신가요?',
  'home.qrBody': '책 속 QR을 찍으면 그 도서관으로 바로 이동해요',
  'home.categoryTitle': '주제별 도서관',
  'home.categorySub': '관심 있는 주제를 골라 보세요',
  'home.featuredTitle': '이번 주 추천 도서관',
  'home.featuredSub': '가이드북이 고른 특별한 공간',
  'home.seeAll': '전체보기',
  'home.recentTitle': '최근 본 도서관',
  'home.offline': '네트워크가 불안정해 마지막으로 본 정보를 보여드리고 있어요',

  'search.placeholder': '도서관명, 지역, 주제 검색',
  'search.allCategories': '전체 주제',
  'search.openNow': '지금 운영중',
  'search.nationwide': '전국',
  'search.count': '도서관 {n}곳',
  'search.countInCategory': '{c} 도서관 {n}곳',
  'search.stale': ' · 오프라인 저장본',
  'search.emptyTitle': '조건에 맞는 도서관이 없어요',
  'search.emptyBody': '검색어나 필터를 조금 바꿔 보세요',
  'search.errorTitle': '목록을 불러오지 못했어요',
  'search.errorBody': '네트워크 상태를 확인한 뒤 다시 시도해 주세요',

  'badge.open': '운영중',
  'badge.closed': '운영종료',
  'unit.places': '{n}곳',
  'a11y.category': '{c} 주제 도서관 {n}곳 보기',

  'lang.title': '언어',
  'lang.note': '도서관 이름과 주소는 원문 그대로 보여드려요',
  'lang.close': '닫기',

  'cat.landmark': '랜드마크',
  'cat.kids': '어린이',
  'cat.language': '어학',
  'cat.music': '음악',
  'cat.art': '예술',
  'cat.history': '역사',
  'cat.nature': '자연',
  'cat.science': '과학',
  'cat.comics': '만화',
  'cat.food': '음식',
  'cat.travel': '여행',
  'cat.humanities': '인문',

  'fav.savedCount': '{n}곳을 저장했어요',
  'fav.prompt': '가고 싶은 도서관을 모아 두세요',
  'fav.emptyTitle': '아직 저장한 도서관이 없어요',
  'fav.emptyBody': '도서관 상세 화면의 하트를 눌러\n나만의 나들이 목록을 만들어 보세요',

  'my.tagline': '달곰이와 도서관 나들이 중',
  'my.taglineSub': '로그인 없이도 기록은 이 기기에 저장돼요',
  'my.statFavorites': '즐겨찾기',
  'my.statVisits': '방문 기록',
  'my.statRecent': '최근 본 곳',
  'my.recentVisited': '최근 다녀온 도서관',
  'my.settings': '설정',
  'my.notifications': '알림 설정',
  'my.login': '로그인 / 기기 간 동기화',
  'my.dressUp': '달곰이 꾸미기',
  'my.reset': '기록 전체 삭제',
  'my.comingSoon': '준비중',
  'my.resetTitle': '기록을 모두 지울까요?',
  'my.resetBody': '즐겨찾기, 최근 본 도서관, 방문 기록이 모두 삭제돼요. 되돌릴 수 없습니다.',
  'my.cancel': '취소',
  'my.delete': '삭제',

  'chat.title': '달곰이에게 물어보기',
  'chat.sub': '앱에 담긴 132곳 정보로 답해요',
  'chat.thinking': '달곰이가 찾아보는 중',
  'chat.send': '질문 보내기',
  'chat.greeting':
    '안녕하세요, 달곰이예요.\n전국 도서관 132곳을 알고 있어요. 무엇이든 물어보세요.\n\n저는 이 앱에 담긴 정보로만 답해요. 모르는 건 지어내지 않고 모른다고 말할게요.',
  'chat.nameHint': '',

  'lib.notFoundTitle': '도서관 정보를 찾을 수 없어요',
  'lib.notFoundBody': 'QR 코드가 오래되었거나\n주소가 잘못되었을 수 있어요',
  'lib.goHome': '홈으로 가기',
  'lib.landmark': '지역 대표',
  'lib.kindWord': '도서관',
  'lib.favAdd': '즐겨찾기 추가',
  'lib.favRemove': '즐겨찾기 해제',
  'lib.specialty': '특화',
  'lib.region': '지역',
  'lib.address': '위치',
  'lib.hours': '운영시간',
  'lib.closedDays': '휴관일',
  'lib.phone': '전화',
  'lib.homepage': '홈페이지',
  'lib.more': '상세 정보 더보기',
  'lib.less': '접기',
  'lib.mapTitle': '지도로 위치 확인',
  'lib.mapSub': '쓰시는 지도앱으로 바로 열려요',
  'lib.booksTopic': '이 주제의 추천 도서',
  'lib.booksRegion': '{where}에서 많이 빌린 책',
  'lib.booksRegionSub': '이 지역 도서관들의 대출 순위',
  'lib.booksLibrary': '이 도서관에서 많이 빌린 책',
  'lib.booksLibrarySub': '실제 대출 순위',
  'lib.nearbyTitle': '도서관 주변 둘러보기',
  'lib.nearbySub': '책 읽고 나서 들르기 좋은 곳',
  'lib.checkin': '여기 다녀왔어요',

  'nearby.restaurant': '주변 맛집',
  'nearby.cafe': '주변 카페',
  'nearby.culture': '문화·볼거리',
  'nearby.error': '주변 정보를 불러오지 못했어요',
  'nearby.retry': '잠시 후 다시 시도해 주세요',
  'nearby.emptyTitle': '주변 정보가 아직 준비되지 않았어요',
  'nearby.emptyBody': '곧 이 근처의 좋은 곳들을 모아 올릴게요',

  'map.naver': '네이버 지도',
  'map.kakao': '카카오맵',
  'map.open': '{app} 앱에서 이 도서관 위치 보기',
  'map.openNow': '바로 열기',
  'map.opensApp': '지도 앱이 열립니다',
  'image.preparing': '사진을 준비하고 있어요',

  'hours.unknown': '운영시간 정보 준비중',
  'hours.closedToday': '오늘은 휴관일이에요',
  'hours.today': '오늘 {from} - {to}',

  'ob.skip': '건너뛰기',
  'ob.next': '다음',
  'ob.start': '도서관 둘러보기',
  'ob.title1': '안녕! 나는 달곰이야',
  'ob.body1': '전국의 도서관을 함께 다니는 친구예요.\n어떤 도서관이 있는지 같이 보러 갈까요?',
  'ob.title2': '책에서 발견하고, QR로 자세히',
  'ob.body2': '가이드북에서 마음에 드는 도서관을 찾았다면\n옆에 있는 QR 코드를 찍어 보세요.',
  'ob.title3': '나들이 코스로 완성',
  'ob.body3': '지도앱으로 길을 찾고,\n주변 맛집·카페·볼거리까지 한 번에.',

  /*
   * 달곰이가 하는 말.
   *
   * {nameTopic} 은 한국어에만 있다. "서울도서관은 / 강북도서관은" 처럼
   * 받침에 따라 조사가 갈리는데, 그 판단은 코드가 해서 넣어 준다.
   * 다른 말은 그냥 {name} 을 쓴다.
   */
  'bot.help':
    '저는 이 앱에 담긴 132곳 정보로만 답해요. 이런 걸 물어보세요.\n\n· 어린이 도서관 추천해줘\n· 부산에 있는 도서관\n· 지금 문 연 도서관\n· 서울도서관 몇 시까지 해?\n· 한밭도서관 주변 카페\n· 울산종갓집도서관에서 많이 빌린 책\n\n모르는 건 지어내지 않고 모른다고 말할게요.',
  'bot.hello': '안녕하세요, 달곰이예요. 전국 도서관 132곳을 알고 있어요. 무엇을 찾아드릴까요?',
  'bot.thanks': '천만에요! 또 궁금한 게 있으면 물어보세요.',

  'bot.noCoords': '{nameTopic} 아직 좌표를 확인하지 못해서 주변을 찾아드릴 수 없어요.',
  'bot.nearbyNone': '{name} 주변에서 찾은 {kindSubj} 아직 없어요.',
  'bot.nearbyFound': '{name} 주변 {kind} {n}곳이에요. 가까운 순서예요.',

  'bot.hoursUnknown':
    '{name}의 운영시간은 아직 확인하지 못했어요. 확인되지 않은 시간을 알려드리면 헛걸음하실 수 있어서 비워 두고 있어요. 전화로 확인하시는 게 가장 정확해요.',
  'bot.phoneLine': '\n전화: {phone}',
  'bot.hoursMain': '{nameTopic} {label}.',
  'bot.openYes': ' 지금은 열려 있어요.',
  'bot.openNo': ' 지금은 운영시간이 아니에요.',
  'bot.closedLine': '\n휴관일: {days}',

  'bot.phoneIs': '{name} 전화번호는 {phone}이에요.',
  'bot.phoneUnknown': '{name}의 전화번호는 아직 확인하지 못했어요.',
  'bot.closedIs': '{name} 휴관일은 {days}이에요.',
  'bot.closedUnknown': '{name}의 휴관일은 아직 확인하지 못했어요.',
  'bot.addressIs': '{nameTopic} {address}에 있어요. 카드를 누르면 지도앱으로 바로 열 수 있어요.',
  'bot.addressUnknown': '{name}의 주소는 아직 확인하지 못했어요.',

  'bot.booksNone':
    '{name}의 대출 순위는 아직 없어요. 정보나루에 등록되지 않은 도서관이라 대출 데이터를 받아올 수 없어요.',
  'bot.booksRegion': '{where} 지역에서 많이 빌린 책이에요.',
  'bot.booksLibrary': '{name}에서 많이 빌린 책이에요.',

  'bot.sumFocus': '{sido} · {specialty} 특화 도서관이에요.',
  'bot.sumAddress': '주소는 {address}.',
  'bot.sumHours': '운영시간은 {label}.',
  'bot.sumHoursUnknown': '운영시간은 아직 확인 중이에요.',

  'bot.labelBoth': '{sido} {cat} 도서관',
  'bot.labelCat': '{cat} 도서관',
  'bot.labelSido': '{sido} 도서관',
  'bot.labelAny': '도서관',
  'bot.browseNone': '{labelTopic} 찾지 못했어요.',
  'bot.browseNoneOpen':
    '\n운영시간을 확인한 곳이 132곳 중 72곳이라, 나머지는 지금 열려 있는지 판단할 수 없어 빠져 있어요.',
  'bot.browseHeadOpen': '지금 열려 있는 {label} {n}곳이에요.',
  'bot.browseHead': '{label} {n}곳이 있어요.',
  'bot.browseTail': '\n그중 {n}곳을 먼저 보여드릴게요.',

  'bot.needLibrary': '어느 도서관 주변인지 알려주시면 찾아드릴게요. "한밭도서관 주변 카페" 처럼요.',
  'bot.notUnderstood': '"{q}" 는 제가 아직 이해하지 못했어요.',

  'bot.kindCafe': '카페',
  'bot.kindFood': '맛집',
  'bot.kindCulture': '문화·볼거리',

  /* 누르면 그대로 질문으로 보내지므로, 달곰이가 알아듣는 낱말로 쓴다 */
  'bot.sugKids': '어린이 도서관 추천해줘',
  'bot.sugOpen': '지금 문 연 도서관',
  'bot.sugSeoul': '서울 도서관',
  'bot.sugMusic': '음악 도서관',
  'bot.sugHours': '{name} 운영시간',
  'bot.sugBooks': '{name} 인기 도서',
  'bot.sugCafe': '{name} 주변 카페',
  'bot.sugFood': '{name} 주변 맛집',
  'bot.sugCatSido': '{cat} 도서관 서울',
  'bot.sugSeoulCafe': '서울도서관 주변 카페',
  'bot.sugBusanFood': '부산도서관 주변 맛집',
} as const;

export type MessageKey = keyof typeof ko;
type Messages = Record<MessageKey, string>;

const en: Messages = {
  'tab.home': 'Home',
  'tab.search': 'Search',
  'tab.chat': 'Dalgomi',
  'tab.favorites': 'Saved',
  'tab.mypage': 'My',

  'home.greeting': 'Hello!',
  'home.headline': 'Which library\nare you looking for?',
  'home.qrTitle': 'Do you have the guidebook?',
  'home.qrBody': 'Scan a QR code in the book to jump straight to that library',
  'home.categoryTitle': 'Libraries by theme',
  'home.categorySub': 'Pick a theme you are curious about',
  'home.featuredTitle': 'Picks of the week',
  'home.featuredSub': 'Special places chosen by the guidebook',
  'home.seeAll': 'See all',
  'home.recentTitle': 'Recently viewed',
  'home.offline': 'The network is unstable, so we are showing what you saw last.',

  'search.placeholder': 'Search by name, region or theme',
  'search.allCategories': 'All themes',
  'search.openNow': 'Open now',
  'search.nationwide': 'Nationwide',
  'search.count': '{n} libraries',
  'search.countInCategory': '{n} {c} libraries',
  'search.stale': ' · offline copy',
  'search.emptyTitle': 'No libraries match',
  'search.emptyBody': 'Try changing the keyword or the filters',
  'search.errorTitle': 'Could not load the list',
  'search.errorBody': 'Check your connection and try again',

  'badge.open': 'Open',
  'badge.closed': 'Closed',
  'unit.places': '{n}',
  'a11y.category': 'See {n} {c} libraries',

  'lang.title': 'Language',
  'lang.note': 'Library names and addresses stay in Korean',
  'lang.close': 'Close',

  'cat.landmark': 'Landmark',
  'cat.kids': 'Kids',
  'cat.language': 'Language',
  'cat.music': 'Music',
  'cat.art': 'Art',
  'cat.history': 'History',
  'cat.nature': 'Nature',
  'cat.science': 'Science',
  'cat.comics': 'Comics',
  'cat.food': 'Food',
  'cat.travel': 'Travel',
  'cat.humanities': 'Humanities',

  'fav.savedCount': 'You have saved {n} places',
  'fav.prompt': 'Collect the libraries you want to visit',
  'fav.emptyTitle': 'Nothing saved yet',
  'fav.emptyBody': 'Tap the heart on a library page\nto build your own outing list',

  'my.tagline': 'Out and about with Dalgomi',
  'my.taglineSub': 'Your records stay on this device, no sign-in needed',
  'my.statFavorites': 'Saved',
  'my.statVisits': 'Visits',
  'my.statRecent': 'Recently viewed',
  'my.recentVisited': 'Recently visited libraries',
  'my.settings': 'Settings',
  'my.notifications': 'Notifications',
  'my.login': 'Sign in / sync across devices',
  'my.dressUp': 'Dress up Dalgomi',
  'my.reset': 'Delete all records',
  'my.comingSoon': 'Soon',
  'my.resetTitle': 'Delete all records?',
  'my.resetBody':
    'Your saved libraries, recently viewed and visit records will all be deleted. This cannot be undone.',
  'my.cancel': 'Cancel',
  'my.delete': 'Delete',

  'chat.title': 'Ask Dalgomi',
  'chat.sub': 'Answers from the 132 libraries in this app',
  'chat.thinking': 'Dalgomi is looking it up',
  'chat.send': 'Send question',
  'chat.greeting':
    'Hello, I am Dalgomi.\nI know 132 libraries across Korea. Ask me anything.\n\nI answer only from what is in this app. If I do not know something, I will say so instead of making it up.',
  'chat.nameHint': 'Ask in English. Library names stay Korean — type them as they appear, like 서울도서관.',

  'lib.notFoundTitle': 'Library not found',
  'lib.notFoundBody': 'The QR code may be out of date,\nor the address may be wrong',
  'lib.goHome': 'Go home',
  'lib.landmark': 'Local landmark',
  'lib.kindWord': 'Library',
  'lib.favAdd': 'Add to saved',
  'lib.favRemove': 'Remove from saved',
  'lib.specialty': 'Focus',
  'lib.region': 'Region',
  'lib.address': 'Address',
  'lib.hours': 'Hours',
  'lib.closedDays': 'Closed',
  'lib.phone': 'Phone',
  'lib.homepage': 'Website',
  'lib.more': 'More details',
  'lib.less': 'Show less',
  'lib.mapTitle': 'Find it on a map',
  'lib.mapSub': 'Opens in the map app you use',
  'lib.booksTopic': 'Books on this theme',
  'lib.booksRegion': 'Most borrowed in {where}',
  'lib.booksRegionSub': 'Loan ranking across libraries in this region',
  'lib.booksLibrary': 'Most borrowed at this library',
  'lib.booksLibrarySub': 'Actual loan ranking',
  'lib.nearbyTitle': 'Around the library',
  'lib.nearbySub': 'Good places to stop by after reading',
  'lib.checkin': 'I visited here',

  'nearby.restaurant': 'Places to eat',
  'nearby.cafe': 'Cafes',
  'nearby.culture': 'Culture and sights',
  'nearby.error': 'Could not load nearby places',
  'nearby.retry': 'Please try again in a moment',
  'nearby.emptyTitle': 'Nearby information is not ready yet',
  'nearby.emptyBody': 'We will gather good places around here soon',

  'map.naver': 'Naver Map',
  'map.kakao': 'KakaoMap',
  'map.open': 'See this library in {app}',
  'map.openNow': 'Open now',
  'map.opensApp': 'The map app will open',
  'image.preparing': 'Photo coming soon',

  'hours.unknown': 'Opening hours not confirmed yet',
  'hours.closedToday': 'Closed today',
  'hours.today': 'Today {from} - {to}',

  'ob.skip': 'Skip',
  'ob.next': 'Next',
  'ob.start': 'Explore libraries',
  'ob.title1': 'Hi! I am Dalgomi',
  'ob.body1':
    'I am your companion for libraries across Korea.\nShall we go and see what is out there?',
  'ob.title2': 'Find it in the book, scan for more',
  'ob.body2': 'Found a library you like in the guidebook?\nScan the QR code next to it.',
  'ob.title3': 'Make it a day out',
  'ob.body3':
    'Get directions in your map app,\nplus places to eat, cafes and sights nearby.',

  /* 도서관 이름은 한국어 그대로 쓴다. 예시에도 한글 이름을 남겨
     "이름은 한글로 적으면 된다" 를 자연스럽게 알려 준다. */
  'bot.help':
    'I answer only from the 132 libraries in this app. Try asking things like this.\n\n· Recommend kids libraries\n· Libraries in Busan\n· Libraries open now\n· 서울도서관 hours\n· Cafes near 한밭도서관\n· Popular books at 울산종갓집도서관\n\nIf I do not know something, I will say so instead of making it up.',
  'bot.hello': 'Hello, I am Dalgomi. I know 132 libraries across Korea. What can I find for you?',
  'bot.thanks': 'You are welcome! Ask me anything else.',

  'bot.noCoords':
    'We have not confirmed the coordinates of {name} yet, so I cannot look up what is nearby.',
  'bot.nearbyNone': 'I have not found any {kind} near {name} yet.',
  'bot.nearbyFound': '{n} {kind} near {name}, closest first.',

  'bot.hoursUnknown':
    'The opening hours for {name} are not confirmed yet. Telling you unconfirmed hours could send you there for nothing, so I leave them blank. Calling is the surest way to check.',
  'bot.phoneLine': '\nPhone: {phone}',
  'bot.hoursMain': '{name}: {label}.',
  'bot.openYes': ' It is open right now.',
  'bot.openNo': ' It is not open right now.',
  'bot.closedLine': '\nClosed: {days}',

  'bot.phoneIs': 'The phone number for {name} is {phone}.',
  'bot.phoneUnknown': 'The phone number for {name} is not confirmed yet.',
  'bot.closedIs': '{name} is closed on {days}.',
  'bot.closedUnknown': 'The closing days for {name} are not confirmed yet.',
  'bot.addressIs': '{name} is at {address}. Tap the card to open it in a map app.',
  'bot.addressUnknown': 'The address for {name} is not confirmed yet.',

  'bot.booksNone':
    'There is no loan ranking for {name} yet. It is not registered with the national library data service, so loan data cannot be fetched.',
  'bot.booksRegion': 'The most borrowed books in {where}.',
  'bot.booksLibrary': 'The most borrowed books at {name}.',

  'bot.sumFocus': 'A library in {sido}. Focus: {specialty}.',
  'bot.sumAddress': 'Address: {address}.',
  'bot.sumHours': 'Hours: {label}.',
  'bot.sumHoursUnknown': 'Hours are not confirmed yet.',

  'bot.labelBoth': '{cat} libraries in {sido}',
  'bot.labelCat': '{cat} libraries',
  'bot.labelSido': 'libraries in {sido}',
  'bot.labelAny': 'libraries',
  'bot.browseNone': 'I could not find any {label}.',
  'bot.browseNoneOpen':
    '\nOpening hours are confirmed for only 72 of the 132 libraries, so the rest cannot be judged as open and are left out.',
  'bot.browseHeadOpen': '{n} {label} open right now.',
  'bot.browseHead': 'There are {n} {label}.',
  'bot.browseTail': '\nHere are the first {n}.',

  'bot.needLibrary':
    'Tell me which library you mean and I will look. For example, "Cafes near 한밭도서관".',
  'bot.notUnderstood': 'I do not understand "{q}" yet.',

  'bot.kindCafe': 'cafes',
  'bot.kindFood': 'places to eat',
  'bot.kindCulture': 'culture and sights',

  'bot.sugKids': 'Recommend kids libraries',
  'bot.sugOpen': 'Libraries open now',
  'bot.sugSeoul': 'Libraries in Seoul',
  'bot.sugMusic': 'Music libraries',
  'bot.sugHours': '{name} hours',
  'bot.sugBooks': 'Popular books at {name}',
  'bot.sugCafe': 'Cafes near {name}',
  'bot.sugFood': 'Places to eat near {name}',
  'bot.sugCatSido': '{cat} libraries in Seoul',
  'bot.sugSeoulCafe': 'Cafes near 서울도서관',
  'bot.sugBusanFood': 'Places to eat near 부산도서관',
};

const ja: Messages = {
  'tab.home': 'ホーム',
  'tab.search': '検索',
  'tab.chat': 'ダルゴミ',
  'tab.favorites': 'お気に入り',
  'tab.mypage': 'マイ',

  'home.greeting': 'こんにちは！',
  'home.headline': 'どんな図書館を\nお探しですか？',
  'home.qrTitle': 'ガイドブックをお持ちですか？',
  'home.qrBody': '本のQRを読み取ると、その図書館にすぐ移動します',
  'home.categoryTitle': 'テーマ別の図書館',
  'home.categorySub': '気になるテーマを選んでみてください',
  'home.featuredTitle': '今週のおすすめ図書館',
  'home.featuredSub': 'ガイドブックが選んだ特別な空間',
  'home.seeAll': 'すべて見る',
  'home.recentTitle': '最近見た図書館',
  'home.offline': '通信が不安定なため、最後に見た情報を表示しています',

  'search.placeholder': '図書館名・地域・テーマで検索',
  'search.allCategories': 'すべてのテーマ',
  'search.openNow': '開館中',
  'search.nationwide': '全国',
  'search.count': '図書館 {n}館',
  'search.countInCategory': '{c} 図書館 {n}館',
  'search.stale': ' · オフライン保存版',
  'search.emptyTitle': '条件に合う図書館がありません',
  'search.emptyBody': '検索語やフィルターを少し変えてみてください',
  'search.errorTitle': '一覧を読み込めませんでした',
  'search.errorBody': '通信状態を確認して、もう一度お試しください',

  'badge.open': '開館中',
  'badge.closed': '閉館',
  'unit.places': '{n}館',
  'a11y.category': '{c} テーマの図書館 {n}館を見る',

  'lang.title': '言語',
  'lang.note': '図書館名と住所は原文のまま表示します',
  'lang.close': '閉じる',

  'cat.landmark': 'ランドマーク',
  'cat.kids': 'こども',
  'cat.language': '語学',
  'cat.music': '音楽',
  'cat.art': '芸術',
  'cat.history': '歴史',
  'cat.nature': '自然',
  'cat.science': '科学',
  'cat.comics': 'マンガ',
  'cat.food': '食',
  'cat.travel': '旅行',
  'cat.humanities': '人文',

  'fav.savedCount': '{n}館を保存しました',
  'fav.prompt': '行きたい図書館を集めておきましょう',
  'fav.emptyTitle': 'まだ保存した図書館がありません',
  'fav.emptyBody': '図書館ページのハートを押して\n自分だけのおでかけリストを作りましょう',

  'my.tagline': 'ダルゴミと図書館めぐり中',
  'my.taglineSub': 'ログインなしでも記録はこの端末に保存されます',
  'my.statFavorites': 'お気に入り',
  'my.statVisits': '訪問記録',
  'my.statRecent': '最近見た所',
  'my.recentVisited': '最近行った図書館',
  'my.settings': '設定',
  'my.notifications': '通知設定',
  'my.login': 'ログイン / 端末間の同期',
  'my.dressUp': 'ダルゴミを着せ替え',
  'my.reset': '記録をすべて削除',
  'my.comingSoon': '準備中',
  'my.resetTitle': '記録をすべて消しますか？',
  'my.resetBody':
    'お気に入り、最近見た図書館、訪問記録がすべて削除されます。元に戻せません。',
  'my.cancel': 'キャンセル',
  'my.delete': '削除',

  'chat.title': 'ダルゴミに聞く',
  'chat.sub': 'アプリに入っている132館の情報で答えます',
  'chat.thinking': 'ダルゴミが調べています',
  'chat.send': '質問を送る',
  'chat.greeting':
    'こんにちは、ダルゴミです。\n韓国じゅうの図書館132館を知っています。何でも聞いてください。\n\n私はこのアプリに入っている情報だけで答えます。分からないことは作り話をせず、分からないと言います。',
  'chat.nameHint': '日本語で聞けます。図書館名は韓国語のままなので 서울도서관 のように入力してください。',

  'lib.notFoundTitle': '図書館の情報が見つかりません',
  'lib.notFoundBody': 'QRコードが古いか、\n住所が間違っている可能性があります',
  'lib.goHome': 'ホームへ',
  'lib.landmark': '地域の代表',
  'lib.kindWord': '図書館',
  'lib.favAdd': 'お気に入りに追加',
  'lib.favRemove': 'お気に入りから外す',
  'lib.specialty': '特化',
  'lib.region': '地域',
  'lib.address': '場所',
  'lib.hours': '開館時間',
  'lib.closedDays': '休館日',
  'lib.phone': '電話',
  'lib.homepage': 'ホームページ',
  'lib.more': '詳しい情報を見る',
  'lib.less': '閉じる',
  'lib.mapTitle': '地図で場所を確認',
  'lib.mapSub': 'お使いの地図アプリでそのまま開きます',
  'lib.booksTopic': 'このテーマのおすすめ本',
  'lib.booksRegion': '{where}でよく借りられた本',
  'lib.booksRegionSub': 'この地域の図書館の貸出ランキング',
  'lib.booksLibrary': 'この図書館でよく借りられた本',
  'lib.booksLibrarySub': '実際の貸出ランキング',
  'lib.nearbyTitle': '図書館の周りを見る',
  'lib.nearbySub': '本を読んだあとに寄りたい場所',
  'lib.checkin': 'ここに行ってきました',

  'nearby.restaurant': '周辺のグルメ',
  'nearby.cafe': '周辺のカフェ',
  'nearby.culture': '文化・見どころ',
  'nearby.error': '周辺の情報を読み込めませんでした',
  'nearby.retry': '少し経ってからもう一度お試しください',
  'nearby.emptyTitle': '周辺の情報はまだ準備中です',
  'nearby.emptyBody': 'この近くの良い場所をまもなく集めます',

  'map.naver': 'Naver Map',
  'map.kakao': 'KakaoMap',
  'map.open': '{app} でこの図書館の場所を見る',
  'map.openNow': 'すぐ開く',
  'map.opensApp': '地図アプリが開きます',
  'image.preparing': '写真は準備中です',

  'hours.unknown': '開館時間は確認中です',
  'hours.closedToday': '本日は休館日です',
  'hours.today': '本日 {from} - {to}',

  'ob.skip': 'スキップ',
  'ob.next': '次へ',
  'ob.start': '図書館を見てみる',
  'ob.title1': 'こんにちは！ダルゴミです',
  'ob.body1':
    '韓国じゅうの図書館を一緒にめぐる友だちです。\nどんな図書館があるか見に行きませんか？',
  'ob.title2': '本で見つけて、QRで詳しく',
  'ob.body2': 'ガイドブックで気になる図書館を見つけたら\n横のQRコードを読み取ってください。',
  'ob.title3': 'おでかけコースに',
  'ob.body3': '地図アプリで道を調べて、\n周辺のグルメ・カフェ・見どころまで一度に。',

  'bot.help':
    'このアプリに入っている132館の情報だけで答えます。こんなふうに聞いてください。\n\n· こども図書館のおすすめ\n· 釜山の図書館\n· 今開いている図書館\n· 서울도서관 の開館時間\n· 한밭도서관 の周辺カフェ\n· 울산종갓집도서관 でよく借りられた本\n\n分からないことは作り話をせず、分からないと言います。',
  'bot.hello':
    'こんにちは、ダルゴミです。韓国じゅうの図書館132館を知っています。何をお探しですか？',
  'bot.thanks': 'どういたしまして！ほかにも気になることがあれば聞いてください。',

  'bot.noCoords': '{name} はまだ座標を確認できていないので、周辺をお探しできません。',
  'bot.nearbyNone': '{name} の周辺で見つかった{kind}はまだありません。',
  'bot.nearbyFound': '{name} の周辺の{kind}が{n}件です。近い順です。',

  'bot.hoursUnknown':
    '{name} の開館時間はまだ確認できていません。確認していない時間をお伝えすると無駄足になりかねないので、空けてあります。電話で確かめるのが確実です。',
  'bot.phoneLine': '\n電話: {phone}',
  'bot.hoursMain': '{name} は {label}。',
  'bot.openYes': ' いまは開いています。',
  'bot.openNo': ' いまは開館時間ではありません。',
  'bot.closedLine': '\n休館日: {days}',

  'bot.phoneIs': '{name} の電話番号は {phone} です。',
  'bot.phoneUnknown': '{name} の電話番号はまだ確認できていません。',
  'bot.closedIs': '{name} の休館日は {days} です。',
  'bot.closedUnknown': '{name} の休館日はまだ確認できていません。',
  'bot.addressIs': '{name} は {address} にあります。カードを押すと地図アプリで開けます。',
  'bot.addressUnknown': '{name} の住所はまだ確認できていません。',

  'bot.booksNone':
    '{name} の貸出ランキングはまだありません。図書館情報ナルに登録されていない図書館なので、貸出データを取得できません。',
  'bot.booksRegion': '{where} 地域でよく借りられた本です。',
  'bot.booksLibrary': '{name} でよく借りられた本です。',

  'bot.sumFocus': '{sido} の図書館です。特化: {specialty}。',
  'bot.sumAddress': '住所は {address}。',
  'bot.sumHours': '開館時間は {label}。',
  'bot.sumHoursUnknown': '開館時間はまだ確認中です。',

  'bot.labelBoth': '{sido}の{cat}図書館',
  'bot.labelCat': '{cat}図書館',
  'bot.labelSido': '{sido}の図書館',
  'bot.labelAny': '図書館',
  'bot.browseNone': '{label}は見つかりませんでした。',
  'bot.browseNoneOpen':
    '\n開館時間を確認できたのは132館のうち72館なので、残りはいま開いているか判断できず外れています。',
  'bot.browseHeadOpen': 'いま開いている{label}が{n}館です。',
  'bot.browseHead': '{label}が{n}館あります。',
  'bot.browseTail': '\nそのうち{n}館を先にお見せします。',

  'bot.needLibrary':
    'どの図書館の周辺かを教えていただければお探しします。「한밭도서관 の周辺カフェ」のように。',
  'bot.notUnderstood': '「{q}」はまだ理解できませんでした。',

  'bot.kindCafe': 'カフェ',
  'bot.kindFood': 'グルメ',
  'bot.kindCulture': '文化・見どころ',

  'bot.sugKids': 'こども図書館のおすすめ',
  'bot.sugOpen': '今開いている図書館',
  'bot.sugSeoul': 'ソウルの図書館',
  'bot.sugMusic': '音楽の図書館',
  'bot.sugHours': '{name} の開館時間',
  'bot.sugBooks': '{name} の人気の本',
  'bot.sugCafe': '{name} の周辺カフェ',
  'bot.sugFood': '{name} の周辺グルメ',
  'bot.sugCatSido': 'ソウルの{cat}図書館',
  'bot.sugSeoulCafe': '서울도서관 の周辺カフェ',
  'bot.sugBusanFood': '부산도서관 の周辺グルメ',
};

const zh: Messages = {
  'tab.home': '首页',
  'tab.search': '搜索',
  'tab.chat': '达尔戈米',
  'tab.favorites': '收藏',
  'tab.mypage': '我的',

  'home.greeting': '你好！',
  'home.headline': '您在找\n哪座图书馆？',
  'home.qrTitle': '您有导览手册吗？',
  'home.qrBody': '扫描书中的二维码，即可直接前往该图书馆',
  'home.categoryTitle': '主题图书馆',
  'home.categorySub': '选一个您感兴趣的主题',
  'home.featuredTitle': '本周推荐图书馆',
  'home.featuredSub': '导览手册精选的特别空间',
  'home.seeAll': '查看全部',
  'home.recentTitle': '最近浏览',
  'home.offline': '网络不稳定，正在显示您上次查看的信息',

  'search.placeholder': '搜索馆名、地区或主题',
  'search.allCategories': '全部主题',
  'search.openNow': '正在开放',
  'search.nationwide': '全国',
  'search.count': '{n} 家图书馆',
  'search.countInCategory': '{c}图书馆 {n} 家',
  'search.stale': ' · 离线副本',
  'search.emptyTitle': '没有符合条件的图书馆',
  'search.emptyBody': '试着调整关键词或筛选条件',
  'search.errorTitle': '无法加载列表',
  'search.errorBody': '请检查网络后重试',

  'badge.open': '开放中',
  'badge.closed': '已闭馆',
  'unit.places': '{n}家',
  'a11y.category': '查看{c}主题图书馆 {n} 家',

  'lang.title': '语言',
  'lang.note': '图书馆名称和地址保留韩文原文',
  'lang.close': '关闭',

  'cat.landmark': '地标',
  'cat.kids': '儿童',
  'cat.language': '语言',
  'cat.music': '音乐',
  'cat.art': '艺术',
  'cat.history': '历史',
  'cat.nature': '自然',
  'cat.science': '科学',
  'cat.comics': '漫画',
  'cat.food': '美食',
  'cat.travel': '旅行',
  'cat.humanities': '人文',

  'fav.savedCount': '已收藏 {n} 家',
  'fav.prompt': '把想去的图书馆收藏起来吧',
  'fav.emptyTitle': '还没有收藏的图书馆',
  'fav.emptyBody': '在图书馆详情页点击爱心\n就能建立属于自己的出行清单',

  'my.tagline': '正和达尔戈米逛图书馆',
  'my.taglineSub': '无需登录，记录保存在这台设备上',
  'my.statFavorites': '收藏',
  'my.statVisits': '到访记录',
  'my.statRecent': '最近浏览',
  'my.recentVisited': '最近去过的图书馆',
  'my.settings': '设置',
  'my.notifications': '通知设置',
  'my.login': '登录 / 多设备同步',
  'my.dressUp': '装扮达尔戈米',
  'my.reset': '删除全部记录',
  'my.comingSoon': '敬请期待',
  'my.resetTitle': '要删除全部记录吗？',
  'my.resetBody': '收藏、最近浏览和到访记录都会被删除，且无法恢复。',
  'my.cancel': '取消',
  'my.delete': '删除',

  'chat.title': '问问达尔戈米',
  'chat.sub': '根据应用内 132 家图书馆的资料回答',
  'chat.thinking': '达尔戈米正在查找',
  'chat.send': '发送问题',
  'chat.greeting':
    '你好，我是达尔戈米。\n我知道韩国各地的 132 家图书馆，什么都可以问我。\n\n我只根据这个应用里的资料回答。不知道的事情我不会编造，会直接说不知道。',
  'chat.nameHint': '可以用中文提问。图书馆名称保持韩文，请照原样输入，例如 서울도서관。',

  'lib.notFoundTitle': '找不到这家图书馆的资料',
  'lib.notFoundBody': '二维码可能已过期，\n或者地址有误',
  'lib.goHome': '回到首页',
  'lib.landmark': '地区代表',
  'lib.kindWord': '图书馆',
  'lib.favAdd': '加入收藏',
  'lib.favRemove': '取消收藏',
  'lib.specialty': '特色',
  'lib.region': '地区',
  'lib.address': '位置',
  'lib.hours': '开放时间',
  'lib.closedDays': '闭馆日',
  'lib.phone': '电话',
  'lib.homepage': '官网',
  'lib.more': '查看更多信息',
  'lib.less': '收起',
  'lib.mapTitle': '在地图上查看',
  'lib.mapSub': '直接用您常用的地图应用打开',
  'lib.booksTopic': '这个主题的推荐图书',
  'lib.booksRegion': '{where}借阅最多的书',
  'lib.booksRegionSub': '该地区图书馆的借阅排行',
  'lib.booksLibrary': '这家图书馆借阅最多的书',
  'lib.booksLibrarySub': '实际借阅排行',
  'lib.nearbyTitle': '图书馆周边',
  'lib.nearbySub': '读完书适合顺路去的地方',
  'lib.checkin': '我来过这里',

  'nearby.restaurant': '周边美食',
  'nearby.cafe': '周边咖啡',
  'nearby.culture': '文化·景点',
  'nearby.error': '无法加载周边信息',
  'nearby.retry': '请稍后再试',
  'nearby.emptyTitle': '周边信息尚未准备好',
  'nearby.emptyBody': '我们很快会整理这附近的好去处',

  'map.naver': 'Naver Map',
  'map.kakao': 'KakaoMap',
  'map.open': '在 {app} 中查看这家图书馆的位置',
  'map.openNow': '立即打开',
  'map.opensApp': '将打开地图应用',
  'image.preparing': '照片准备中',

  'hours.unknown': '开放时间待确认',
  'hours.closedToday': '今天闭馆',
  'hours.today': '今天 {from} - {to}',

  'ob.skip': '跳过',
  'ob.next': '下一步',
  'ob.start': '开始逛图书馆',
  'ob.title1': '你好！我是达尔戈米',
  'ob.body1': '我是陪你逛遍韩国图书馆的朋友。\n一起去看看有哪些图书馆吧？',
  'ob.title2': '在书里发现，扫码看详情',
  'ob.body2': '在导览手册里找到喜欢的图书馆，\n扫描旁边的二维码就好。',
  'ob.title3': '凑成一天的行程',
  'ob.body3': '用地图应用找路，\n周边美食、咖啡和景点一次搞定。',

  'bot.help':
    '我只根据这个应用里的 132 家图书馆资料回答。可以这样问我。\n\n· 推荐儿童图书馆\n· 釜山的图书馆\n· 现在开放的图书馆\n· 서울도서관 开放时间\n· 한밭도서관 周边咖啡\n· 울산종갓집도서관 借阅最多的书\n\n不知道的事情我不会编造，会直接说不知道。',
  'bot.hello': '你好，我是达尔戈米。我知道韩国各地的 132 家图书馆。想找什么呢？',
  'bot.thanks': '不客气！还有想问的随时说。',

  'bot.noCoords': '{name} 的坐标还没有确认，所以无法查找周边。',
  'bot.nearbyNone': '{name} 周边还没有找到{kind}。',
  'bot.nearbyFound': '{name} 周边的{kind}共 {n} 处，按距离由近到远。',

  'bot.hoursUnknown':
    '{name} 的开放时间还没有确认。告诉您未经确认的时间可能让您白跑一趟，所以这里留空。打电话确认最准确。',
  'bot.phoneLine': '\n电话: {phone}',
  'bot.hoursMain': '{name}：{label}。',
  'bot.openYes': ' 现在开放中。',
  'bot.openNo': ' 现在不在开放时间内。',
  'bot.closedLine': '\n闭馆日: {days}',

  'bot.phoneIs': '{name} 的电话是 {phone}。',
  'bot.phoneUnknown': '{name} 的电话还没有确认。',
  'bot.closedIs': '{name} 的闭馆日是 {days}。',
  'bot.closedUnknown': '{name} 的闭馆日还没有确认。',
  'bot.addressIs': '{name} 位于 {address}。点击卡片可以直接用地图应用打开。',
  'bot.addressUnknown': '{name} 的地址还没有确认。',

  'bot.booksNone':
    '{name} 还没有借阅排行。这家图书馆没有在图书馆信息纳鲁登记，无法取得借阅数据。',
  'bot.booksRegion': '{where} 地区借阅最多的书。',
  'bot.booksLibrary': '{name} 借阅最多的书。',

  'bot.sumFocus': '位于{sido}的图书馆。特色：{specialty}。',
  'bot.sumAddress': '地址：{address}。',
  'bot.sumHours': '开放时间：{label}。',
  'bot.sumHoursUnknown': '开放时间还在确认中。',

  'bot.labelBoth': '{sido}的{cat}图书馆',
  'bot.labelCat': '{cat}图书馆',
  'bot.labelSido': '{sido}的图书馆',
  'bot.labelAny': '图书馆',
  'bot.browseNone': '没有找到{label}。',
  'bot.browseNoneOpen':
    '\n132 家中只有 72 家确认了开放时间，其余无法判断现在是否开放，因此没有列入。',
  'bot.browseHeadOpen': '现在开放的{label}共 {n} 家。',
  'bot.browseHead': '{label}共 {n} 家。',
  'bot.browseTail': '\n先给您看其中 {n} 家。',

  'bot.needLibrary': '告诉我是哪家图书馆的周边，我就去找。例如「한밭도서관 周边咖啡」。',
  'bot.notUnderstood': '我还听不懂「{q}」。',

  'bot.kindCafe': '咖啡',
  'bot.kindFood': '美食',
  'bot.kindCulture': '文化景点',

  'bot.sugKids': '推荐儿童图书馆',
  'bot.sugOpen': '现在开放的图书馆',
  'bot.sugSeoul': '首尔的图书馆',
  'bot.sugMusic': '音乐图书馆',
  'bot.sugHours': '{name} 开放时间',
  'bot.sugBooks': '{name} 热门图书',
  'bot.sugCafe': '{name} 周边咖啡',
  'bot.sugFood': '{name} 周边美食',
  'bot.sugCatSido': '首尔的{cat}图书馆',
  'bot.sugSeoulCafe': '서울도서관 周边咖啡',
  'bot.sugBusanFood': '부산도서관 周边美食',
};

const DICT: Record<Lang, Messages> = { ko, en, ja, zh };

/**
 * 지역 이름.
 *
 * 도서관 이름과 달리 지명에는 이미 정해진 표기가 있다. 서울은 Seoul 이고
 * 首尔이고 ソウル이다. 지어내는 게 아니라 있는 이름을 쓰는 것이라
 * 옮겨도 된다.
 *
 * ⚠️ 여기서 바꾸는 것은 **보여 주는 글자뿐**이다. 걸러 내는 값은 한국어
 *   원문 그대로다. 도서관 데이터의 region.sido 가 한국어이기 때문이다.
 *
 * 주소 전체는 옮기지 않는다. "Seoul 중구 세종대로" 처럼 반만 옮긴 주소는
 * 물어볼 때도 찾아갈 때도 쓸모가 없다.
 */
const REGION_NAMES: Record<Lang, Record<string, string>> = {
  ko: {},
  en: {
    서울: 'Seoul', 경기: 'Gyeonggi', 인천: 'Incheon', 강원: 'Gangwon',
    충청: 'Chungcheong', 대전: 'Daejeon', 세종: 'Sejong', 전라: 'Jeolla',
    광주: 'Gwangju', 경상: 'Gyeongsang', 대구: 'Daegu', 울산: 'Ulsan',
    부산: 'Busan', 제주: 'Jeju',
  },
  ja: {
    서울: 'ソウル', 경기: '京畿', 인천: '仁川', 강원: '江原',
    충청: '忠清', 대전: '大田', 세종: '世宗', 전라: '全羅',
    광주: '光州', 경상: '慶尚', 대구: '大邱', 울산: '蔚山',
    부산: '釜山', 제주: '済州',
  },
  zh: {
    서울: '首尔', 경기: '京畿', 인천: '仁川', 강원: '江原',
    충청: '忠清', 대전: '大田', 세종: '世宗', 전라: '全罗',
    광주: '光州', 경상: '庆尚', 대구: '大邱', 울산: '蔚山',
    부산: '釜山', 제주: '济州',
  },
};

/** 지역 이름을 그 말로 보여 준다. 모르는 지역은 원문 그대로 돌려준다. */
export function regionName(lang: Lang, sido: string): string {
  return REGION_NAMES[lang]?.[sido] ?? sido;
}

/**
 * 한 문장을 골라 온다.
 *
 * 열쇠가 없거나 아직 안 옮긴 문장은 **한국어로 떨어진다.**
 * 빈칸이나 'tab.home' 같은 열쇠가 화면에 나오는 것보다 낫다.
 */
export function translate(
  lang: Lang,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  const text = DICT[lang]?.[key] ?? ko[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole
  );
}

/** 화면에서 쓰는 고리. 언어를 바꾸면 이걸 쓰는 화면이 알아서 다시 그려진다. */
export function useT() {
  const lang = useAppStore((s) => s.language);
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );
  return { t, lang };
}
