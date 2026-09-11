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

export const LANGUAGES = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
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
  'chat.koreanOnly': '',

  'lib.notFoundTitle': '도서관 정보를 찾을 수 없어요',
  'lib.notFoundBody': 'QR 코드가 오래되었거나\n주소가 잘못되었을 수 있어요',
  'lib.goHome': '홈으로 가기',
  'lib.landmark': '지역 대표',
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
  'chat.koreanOnly': 'Dalgomi understands Korean questions only for now',

  'lib.notFoundTitle': 'Library not found',
  'lib.notFoundBody': 'The QR code may be out of date,\nor the address may be wrong',
  'lib.goHome': 'Go home',
  'lib.landmark': 'Local landmark',
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
  'chat.koreanOnly': 'ダルゴミはいまのところ韓国語の質問だけ理解します',

  'lib.notFoundTitle': '図書館の情報が見つかりません',
  'lib.notFoundBody': 'QRコードが古いか、\n住所が間違っている可能性があります',
  'lib.goHome': 'ホームへ',
  'lib.landmark': '地域の代表',
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
  'chat.koreanOnly': '达尔戈米目前只能听懂韩语提问',

  'lib.notFoundTitle': '找不到这家图书馆的资料',
  'lib.notFoundBody': '二维码可能已过期，\n或者地址有误',
  'lib.goHome': '回到首页',
  'lib.landmark': '地区代表',
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
};

const DICT: Record<Lang, Messages> = { ko, en, ja, zh };

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
