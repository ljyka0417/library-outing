import type { Lang } from './index';
import address from './library-text/address.json';
import hours from './library-text/hours.json';
import transit from './library-text/transit.json';
import programs from './library-text/programs.json';
import misc from './library-text/misc.json';
import nearby from './library-text/nearby.json';
import { CATEGORIES } from '@/data/categories';

/**
 * 도서관 정보(가이드북 원문, 한국어)와 주변 장소 종류(카카오·관광공사 분류)를 고른 언어로 옮긴다.
 * 가게·장소 이름 자체는 옮기지 않는다 — 간판이 한국어라 원래 이름이라야 찾는다.
 *
 * 사전은 한국어 원문을 열쇠로, [영어, 일본어, 중국어] 를 값으로 둔다 (src/i18n/library-text/*.json).
 * 같은 문구를 여러 도서관이 쓰면 한 번만 옮기면 되고, 원문이 바뀌면 옮긴 말이 없는 것이
 * 바로 드러난다 (scripts/check-library-text.cjs 가 빠진 것을 찾는다).
 *
 * 개관일·장서 수처럼 꼴이 정해진 것은 규칙으로 옮기고, 꼴에서 벗어난 것만 사전(misc)에 둔다.
 * 사전에도 규칙에도 없으면 원문을 그대로 보인다 — 지어내지 않는다.
 *
 * 주소는 옮긴 말 밑에 한국어 원문을 함께 보여 준다(택시 기사에게 보여 줄 수 있게, LibraryDetail).
 */
type Dict = Record<string, [string, string, string]>;
const DICT: Dict = {
  ...(misc as unknown as Dict),
  ...(address as unknown as Dict),
  ...(hours as unknown as Dict),
  ...(transit as unknown as Dict),
  ...(programs as unknown as Dict),
  ...(nearby as unknown as Dict),
};
const COL: Record<Exclude<Lang, 'ko'>, number> = { en: 0, ja: 1, zh: 2 };

export function libText(ko: string, lang: Lang): string;
export function libText(ko: string | undefined, lang: Lang): string | undefined;
export function libText(ko: string | undefined, lang: Lang): string | undefined {
  if (!ko || lang === 'ko') return ko;
  const hit = DICT[ko];
  if (hit) return hit[COL[lang]];
  return byRule(ko, lang) ?? ko;
}

/** 옮긴 말이 있는지 (검사용) */
export function hasLibText(ko: string, lang: Exclude<Lang, 'ko'>): boolean {
  return !!DICT[ko]?.[COL[lang]] || byRule(ko, lang) !== undefined;
}

/* ── 특화: 책의 특화 이름 = 주제 이름 ─────────────────────── */

const CAT_BY_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.name, c.id]));
/** 특화 이름이 주제 이름이면 그 주제의 열쇠(cat.xxx)를 돌려준다 */
export function specialtyCategory(specialty: string): string | undefined {
  return CAT_BY_NAME[specialty];
}

/* ── 공휴일 이름 ──────────────────────────────────────────── */

const HOLIDAY: Record<string, [string, string, string]> = {
  '1월1일': ["New Year's Day", '元日', '元旦'],
  '신정': ["New Year's Day", '元日', '元旦'],
  '설날': ['Seollal (Lunar New Year)', 'ソルラル（旧正月）', '春节'],
  '삼일절': ['Independence Movement Day', '三・一節', '三一节'],
  '노동절': ['Labor Day', 'メーデー', '劳动节'],
  '어린이날': ["Children's Day", 'こどもの日', '儿童节'],
  '부처님오신날': ["Buddha's Birthday", '釈迦誕生日', '佛诞节'],
  '전국동시지방선거': ['Local Election Day', '統一地方選挙日', '地方选举日'],
  '현충일': ['Memorial Day', '顕忠日', '显忠日'],
  '제헌절': ['Constitution Day', '制憲節', '制宪节'],
  '광복절': ['Liberation Day', '光復節', '光复节'],
  '추석': ['Chuseok', 'チュソク（秋夕）', '中秋节'],
  '개천절': ['National Foundation Day', '開天節', '开天节'],
  '한글날': ['Hangeul Day', 'ハングルの日', '韩文日'],
  '기독탄신일': ['Christmas Day', 'クリスマス', '圣诞节'],
};
export function holidayText(name: string, lang: Lang): string {
  if (lang === 'ko') return name;
  const sub = /^대체공휴일\((.+)\)$/.exec(name);
  if (sub) {
    const base = holidayText(sub[1], lang);
    return lang === 'en' ? `Substitute holiday (${base})` : lang === 'ja' ? `振替休日（${base}）` : `补休（${base}）`;
  }
  return HOLIDAY[name]?.[COL[lang]] ?? name;
}

/* ── 규칙: 날짜·장서 수 ───────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 연·월·일(일·월은 없을 수 있다)을 그 언어의 날짜로 */
function fmtDate(y: number, m: number | undefined, d: number | undefined, lang: Exclude<Lang, 'ko'>, endOf = false): string {
  if (lang === 'en') {
    const base = m ? (d ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${y}`) : String(y);
    return endOf ? `end of ${base}` : base;
  }
  const s = `${y}年${m ? `${m}月` : ''}${d ? `${d}日` : ''}`;
  return endOf ? (lang === 'ja' ? `${s}末` : `${s}底`) : s;
}

/** 원문에 쓰인 여러 날짜 꼴을 [연, 월?, 일?, 말?] 로 */
function parseDate(s: string): [number, number | undefined, number | undefined, boolean] | undefined {
  const t = s.trim();
  let m = /^(\d{4})년\s*(\d{1,2})월(?:\s*(\d{1,2})일)?(말)?$/.exec(t);
  if (m) return [+m[1], +m[2], m[3] ? +m[3] : undefined, !!m[4]];
  m = /^(\d{4})년(말)?$/.exec(t);
  if (m) return [+m[1], undefined, undefined, !!m[2]];
  m = /^(\d{2}|\d{4})\s*[.-]\s*(\d{1,2})\s*[.-]\s*(\d{1,2})\.?$/.exec(t);
  if (m) return [m[1].length === 2 ? 2000 + +m[1] : +m[1], +m[2], +m[3], false];
  return undefined;
}

function dateText(s: string, lang: Exclude<Lang, 'ko'>): string | undefined {
  const p = parseDate(s);
  return p ? fmtDate(p[0], p[1], p[2], lang, p[3]) : undefined;
}

const UNIT: Record<string, [string, string, string]> = {
  '권': ['books', '冊', '册'],
  '건': ['items', '件', '件'],
  '책·점': ['books & items', '冊・点', '册·件'],
  '권·점': ['books & items', '冊・点', '册·件'],
};

function byRule(ko: string, lang: Lang): string | undefined {
  if (lang === 'ko') return ko;
  const col = COL[lang];

  // 개관일: "2012년 10월 26일"
  const date = dateText(ko, lang);
  if (date) return date;

  // 장서 수: "575,670권 (2026년 8월 31일 기준)" / "114,323권 (2026.08.31 기준)" / "230,238권 (2026.08.31·도서)"
  const h = /^([\d,]+)\s*(권·점|책·점|권|건)\s*(?:\(\s*(.+?)\s*(기준|·도서)?\s*\))?$/.exec(ko);
  if (h) {
    const n = h[1];
    const unit = UNIT[h[2]][col];
    const num = lang === 'en' ? `${n} ${unit}` : `${n}${unit}`;
    if (!h[3]) return num;
    const when = dateText(h[3], lang);
    if (!when) return undefined;
    if (lang === 'en') return `${num} (as of ${when})`;
    return lang === 'ja' ? `${num}（${when}現在）` : `${num}（截至${when}）`;
  }
  return undefined;
}
