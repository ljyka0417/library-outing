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
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
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

const ja: Dict = {
  tabs: { home: 'ホーム', search: '検索', chat: 'ダルゴミ', favorites: 'お気に入り', mypage: 'マイ' },

  common: {
    places: (n) => `${n}件`,
    libraries: (n) => `図書館 ${n}件`,
    open: '開館中',
    closed: '閉館',
    offline: 'オフライン保存',
    soon: '準備中',
    cancel: 'キャンセル',
    delete: '削除',
    openIn: '開く',
    walkMinutes: (n) => `徒歩${n}分`,
  },

  categories: {
    landmark: 'ランドマーク',
    kids: 'こども',
    language: '語学',
    music: '音楽',
    art: '芸術',
    history: '歴史',
    nature: '自然',
    science: '科学',
    comics: 'マンガ',
    food: '食',
    travel: '旅',
    humanities: '人文',
  },

  regions: {
    서울: 'ソウル', 경기: '京畿', 인천: '仁川', 강원: '江原', 충청: '忠清',
    대전: '大田', 세종: '世宗', 전라: '全羅', 광주: '光州', 경상: '慶尚',
    대구: '大邱', 울산: '蔚山', 부산: '釜山', 제주: '済州',
  },

  home: {
    greeting: 'こんにちは！',
    headline: 'どんな図書館を\nお探しですか？',
    qrTitle: 'ガイドブックをお持ちですか？',
    qrBody: '本のQRコードを読み取ると、その図書館にすぐ移動します',
    categories: 'テーマ別図書館',
    categoriesSub: '気になるテーマを選んでください',
    featured: '今週のおすすめ',
    featuredSub: 'ガイドブックが選んだ特別な場所',
    seeAll: 'すべて見る',
    recent: '最近見た図書館',
    staleNote: '通信が不安定なため、前回の内容を表示しています',
    languageTitle: '言語',
  },

  search: {
    placeholder: '図書館名・地域・テーマ',
    allTopics: 'すべてのテーマ',
    openNow: '今開いている',
    nationwide: '全国',
    emptyTitle: '条件に合う図書館がありません',
    emptyBody: '検索語や絞り込みを変えてみてください',
    errorTitle: '一覧を読み込めませんでした',
    errorBody: '通信状態を確認して、もう一度お試しください',
  },

  detail: {
    landmarkBadge: '地域代表',
    specialty: '特化',
    region: '地域',
    address: '所在地',
    hours: '開館時間',
    closedDays: '休館日',
    phone: '電話',
    homepage: 'ホームページ',
    pending: '詳細は準備中です。まず地図で場所をご確認ください。',
    more: '詳細をもっと見る',
    less: '閉じる',
    mapTitle: '地図で場所を確認',
    mapSub: 'お使いの地図アプリで開きます',
    booksLibrary: 'この図書館でよく借りられた本',
    booksLibrarySub: '実際の貸出ランキング',
    booksRegion: (region) => `${region}でよく借りられた本`,
    booksRegionSub: 'この地域の図書館の貸出ランキング',
    booksTopic: 'このテーマのおすすめ本',
    nearbyTitle: '図書館のまわり',
    nearbySub: '本を読んだあとに寄りたい場所',
    checkin: 'ここに行きました',
    notFoundTitle: '図書館が見つかりません',
    notFoundBody: 'QRコードが古いか、\nアドレスが間違っている可能性があります',
    goHome: 'ホームへ',
  },

  nearby: {
    restaurant: 'グルメ',
    cafe: 'カフェ',
    culture: '文化・見どころ',
    empty: 'まだ情報がありません',
  },

  favorites: {
    title: 'お気に入り',
    subtitle: (n) => `${n}件保存しています`,
    emptyTitle: 'まだお気に入りがありません',
    emptyBody: '気に入った図書館のハートを押して\nここに集めてみましょう',
  },

  mypage: {
    name: 'ダルゴミと図書館めぐり中',
    sub: 'ログインなしでも記録はこの端末に保存されます',
    favorites: 'お気に入り',
    visits: '訪問記録',
    recent: '最近見た',
    visited: '最近行った図書館',
    settings: '設定',
    notifications: '通知設定',
    account: 'ログイン / 端末間同期',
    dressUp: 'ダルゴミを着せかえ',
    reset: '記録をすべて削除',
    resetTitle: '記録をすべて消しますか？',
    resetBody: 'お気に入り・最近見た図書館・訪問記録がすべて削除されます。元に戻せません。',
    language: '言語',
  },

  onboarding: {
    skip: 'スキップ',
    next: '次へ',
    start: '図書館を見る',
    slides: [
      {
        title: 'こんにちは！ダルゴミだよ',
        body: '全国の図書館を一緒にまわる友だちです。\nどんな図書館があるか見に行きましょうか？',
      },
      {
        title: '本で見つけて、QRで詳しく',
        body: 'ガイドブックで気になる図書館を見つけたら\n横のQRコードを読み取ってみてください。',
      },
      {
        title: 'おでかけコースに',
        body: '地図アプリで道を調べて、\nまわりのグルメ・カフェ・見どころまで一度に。',
      },
    ],
  },

  chat: {
    title: 'ダルゴミに聞く',
    subtitle: 'このアプリの132館の情報でお答えします',
    placeholder: 'こども図書館をおすすめして',
    thinking: 'ダルゴミが探しています',
    send: '質問を送る',
    greeting:
      'こんにちは、ダルゴミです。\n全国132館の図書館を知っています。何でも聞いてください。\n\nこのアプリにある情報だけでお答えします。わからないことは、作らずに「わからない」と言います。',
    koreanOnly: 'ダルゴミの回答は今のところ韓国語です。引用する図書館データも韓国語です。',
  },
};

const zh: Dict = {
  tabs: { home: '首页', search: '搜索', chat: '达谷米', favorites: '收藏', mypage: '我的' },

  common: {
    places: (n) => `${n}处`,
    libraries: (n) => `${n} 家图书馆`,
    open: '开放中',
    closed: '已闭馆',
    offline: '离线缓存',
    soon: '敬请期待',
    cancel: '取消',
    delete: '删除',
    openIn: '打开',
    walkMinutes: (n) => `步行${n}分钟`,
  },

  categories: {
    landmark: '地标',
    kids: '儿童',
    language: '语言',
    music: '音乐',
    art: '艺术',
    history: '历史',
    nature: '自然',
    science: '科学',
    comics: '漫画',
    food: '美食',
    travel: '旅行',
    humanities: '人文',
  },

  regions: {
    서울: '首尔', 경기: '京畿', 인천: '仁川', 강원: '江原', 충청: '忠清',
    대전: '大田', 세종: '世宗', 전라: '全罗', 광주: '光州', 경상: '庆尚',
    대구: '大邱', 울산: '蔚山', 부산: '釜山', 제주: '济州',
  },

  home: {
    greeting: '你好！',
    headline: '想找什么样的\n图书馆呢？',
    qrTitle: '有导览手册吗？',
    qrBody: '扫描书中的二维码，直接进入那家图书馆',
    categories: '按主题浏览',
    categoriesSub: '选一个感兴趣的主题',
    featured: '本周推荐',
    featuredSub: '导览手册精选的特别空间',
    seeAll: '查看全部',
    recent: '最近浏览',
    staleNote: '网络不稳定，正在显示上次看到的内容',
    languageTitle: '语言',
  },

  search: {
    placeholder: '图书馆名、地区或主题',
    allTopics: '全部主题',
    openNow: '正在开放',
    nationwide: '全国',
    emptyTitle: '没有符合条件的图书馆',
    emptyBody: '试着换个关键词或筛选条件',
    errorTitle: '无法加载列表',
    errorBody: '请检查网络后重试',
  },

  detail: {
    landmarkBadge: '地区代表',
    specialty: '特色',
    region: '地区',
    address: '地址',
    hours: '开放时间',
    closedDays: '休馆日',
    phone: '电话',
    homepage: '官网',
    pending: '详细信息正在准备中，可先在地图上确认位置。',
    more: '查看更多',
    less: '收起',
    mapTitle: '在地图上查看',
    mapSub: '用你常用的地图应用打开',
    booksLibrary: '这家图书馆借阅最多的书',
    booksLibrarySub: '真实借阅排行',
    booksRegion: (region) => `${region}借阅最多的书`,
    booksRegionSub: '该地区图书馆的借阅排行',
    booksTopic: '这个主题的推荐书',
    nearbyTitle: '图书馆周边',
    nearbySub: '读完书顺路去看看',
    checkin: '我来过这里',
    notFoundTitle: '找不到这家图书馆',
    notFoundBody: '二维码可能已过期，\n或者地址有误',
    goHome: '回首页',
  },

  nearby: {
    restaurant: '周边美食',
    cafe: '周边咖啡',
    culture: '文化景点',
    empty: '暂时还没有信息',
  },

  favorites: {
    title: '收藏',
    subtitle: (n) => `已收藏 ${n} 处`,
    emptyTitle: '还没有收藏',
    emptyBody: '点一下喜欢的图书馆上的爱心\n就会收进这里',
  },

  mypage: {
    name: '和达谷米一起逛图书馆',
    sub: '不登录也会把记录保存在这台设备上',
    favorites: '收藏',
    visits: '到访记录',
    recent: '最近浏览',
    visited: '最近去过的图书馆',
    settings: '设置',
    notifications: '通知设置',
    account: '登录 / 多设备同步',
    dressUp: '装扮达谷米',
    reset: '清除全部记录',
    resetTitle: '要清除所有记录吗？',
    resetBody: '收藏、最近浏览和到访记录都会被删除，且无法恢复。',
    language: '语言',
  },

  onboarding: {
    skip: '跳过',
    next: '下一步',
    start: '开始浏览',
    slides: [
      {
        title: '你好！我是达谷米',
        body: '陪你一起逛遍全国图书馆的朋友。\n一起去看看有哪些图书馆吧？',
      },
      {
        title: '在书里发现，用二维码查看',
        body: '在导览手册里看到喜欢的图书馆，\n扫一下旁边的二维码。',
      },
      {
        title: '凑成一天的行程',
        body: '用地图查路线，\n顺便找找周边的美食、咖啡和景点。',
      },
    ],
  },

  chat: {
    title: '问达谷米',
    subtitle: '用这个应用里 132 家图书馆的资料回答',
    placeholder: '推荐一家儿童图书馆',
    thinking: '达谷米正在查找',
    send: '发送问题',
    greeting:
      '你好，我是达谷米。\n我知道韩国 132 家图书馆，什么都可以问我。\n\n我只用这个应用里的资料回答。不知道的事情，我会说不知道，不会编造。',
    koreanOnly: '达谷米目前用韩语回答。它引用的图书馆资料也是韩语。',
  },
};

const DICTS: Record<Language, Dict> = { ko, en, ja, zh };

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
