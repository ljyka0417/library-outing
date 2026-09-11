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
