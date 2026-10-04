import { StyleSheet } from 'react-native';

/**
 * 디자인 토큰
 *
 * 톤앤매너: 파스텔 민트 + 베이지 + 브라운.
 * 가이드북(종이책)의 따뜻한 질감을 앱에서도 이어가기 위해 순백(#FFF) 대신
 * 살짝 미색이 도는 배경을 기본으로 쓴다.
 */

/** 밝은 화면 */
const LIGHT = {
  // 배경
  background: '#FBF8F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EFE7',

  // 브랜드 (민트)
  primary: '#4FA695',
  primaryLight: '#7CC4B4',
  primarySoft: '#E3F2EE',

  // 보조 (브라운)
  brown: '#8B6F5C',
  brownSoft: '#F0E7DE',

  // 텍스트
  text: '#2E2A26',
  textSub: '#7A7269',
  textMuted: '#A79E93',

  // 라인/구분
  border: '#EDE6DC',
  divider: '#F3EDE4',

  // 상태
  open: '#3D9970',
  closed: '#D9776A',
  heart: '#E8615A',

  white: '#FFFFFF',
  black: '#000000',
};

/**
 * 어두운 화면 — 같은 따뜻한 톤을 밤에 맞춰 낮췄다. 순검정 대신 짙은 갈색빛 바탕이라
 * 종이책 느낌이 남는다. white 는 민트 단추 위 글자에 쓰여서 그대로 흰색이다.
 */
const DARK: typeof LIGHT = {
  background: '#171513',
  surface: '#221F1C',
  surfaceAlt: '#2C2824',

  primary: '#5DBBA8',
  primaryLight: '#7CC4B4',
  primarySoft: '#1E3531',

  brown: '#C4A48C',
  brownSoft: '#33291F',

  text: '#F2EDE6',
  textSub: '#B9B0A5',
  textMuted: '#857C72',

  border: '#38332D',
  divider: '#2E2A25',

  open: '#4CB884',
  closed: '#E58A7E',
  heart: '#F06D66',

  white: '#FFFFFF',
  black: '#000000',
};

export type Palette = typeof LIGHT;
export type ColorScheme = 'light' | 'dark';

/**
 * 지금 화면의 색. 다크 모드로 바꾸면 이 객체의 값이 통째로 바뀐다(applyScheme).
 * 화면 코드는 그대로 colors.text 처럼 읽으면 된다 — 다시 그릴 때 새 값을 읽는다.
 */
export const colors: Palette = { ...LIGHT };

/**
 * 마스코트 "달곰이(Dalgomi)" 전용 팔레트.
 *
 * 캐릭터는 어디에 놓이든 같은 색으로 보여야 브랜드가 산다.
 * 그래서 UI 팔레트(colors)와 분리해 두고, 캐릭터를 그리는 곳에서만 쓴다.
 */
export const dalgomi = {
  /** 몸통 - 아이보리 */
  fur: '#F9F2E2',
  /** 주둥이·발바닥 등 한 톤 어두운 면 */
  furShade: '#F0E5D0',
  /** 외곽선 - 순검정이 아닌 짙은 갈색이라 인상이 부드럽다 */
  line: '#3B3129',
  /** 머리 위 초승달 */
  moon: '#F6C93F',
  /** 목에 두른 스카프 */
  scarf: '#7FA94F',
  scarfDark: '#688F40',
  /** 볼터치 */
  cheek: '#F6B3AC',
  /** 귀 안쪽 */
  ear: '#F5D5C8',
  /** 배낭 */
  pack: '#E6C179',
  packDark: '#D3A75B',
  /** 벌린 입 안쪽 */
  mouth: '#7A3B34',
  tongue: '#F2938C',
} as const;

/**
 * 카테고리별 파스텔 배경/포인트 색. 홈 그리드와 뱃지에서 공유한다.
 * types 의 CategoryId 13종과 키가 1:1로 대응해야 한다.
 */
const LIGHT_CATEGORY: Record<string, { bg: string; fg: string }> = {
  landmark: { bg: '#E3F2EE', fg: '#3F8E7E' },
  kids: { bg: '#FFF1DC', fg: '#C98A3C' },
  language: { bg: '#E6F0FB', fg: '#3F7CB8' },
  music: { bg: '#FDE8EC', fg: '#C9536B' },
  art: { bg: '#FBE9E1', fg: '#C46B47' },
  nature: { bg: '#E4F3E6', fg: '#4C8F5A' },
  science: { bg: '#E9E7FB', fg: '#6B5FC4' },
  food: { bg: '#FDF0DC', fg: '#B98A33' },
  travel: { bg: '#E0F0F5', fg: '#3C8296' },
  humanities: { bg: '#EFEDE7', fg: '#6F6A5E' },
  // 법률은 남색, 미디어는 푸른 회색. 이미 쓰는 열두 색과 겹치지 않는 자리를 골랐다.
  law: { bg: '#E7EAF4', fg: '#5A61A8' },
  media: { bg: '#E9EDEF', fg: '#4F707E' },
  // 교육은 예전 역사 칸의 흙빛을 물려받았다. 남은 열두 색과 겹치지 않는다.
  education: { bg: '#F1EBE2', fg: '#8B6F5C' },
};

/** 두 색을 t 만큼 섞는다 (#RRGGBB) */
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** 어두운 화면의 카테고리 색 — 같은 색을 바탕 쪽으로 낮추고 글자는 밝게 */
const DARK_CATEGORY: Record<string, { bg: string; fg: string }> = Object.fromEntries(
  Object.entries(LIGHT_CATEGORY).map(([k, v]) => [k, { bg: mix(v.fg, DARK.background, 0.78), fg: mix(v.fg, '#FFFFFF', 0.3) }])
);

export const categoryColors: Record<string, { bg: string; fg: string }> = Object.fromEntries(
  Object.entries(LIGHT_CATEGORY).map(([k, v]) => [k, { ...v }])
);

/* ── 다크 모드 ────────────────────────────────────────────── */

let schemeNow: ColorScheme = 'light';
let version = 0;

export function currentScheme(): ColorScheme {
  return schemeNow;
}

/** 색을 바꾼다. 바꾼 뒤 화면을 다시 그려야 보인다 (app/_layout.tsx 가 한다) */
export function applyScheme(scheme: ColorScheme) {
  if (scheme === schemeNow) return;
  schemeNow = scheme;
  version++;
  const palette = scheme === 'dark' ? DARK : LIGHT;
  Object.assign(colors, palette);
  // colors 를 애니메이션(worklet) 안에서 바로 읽으면 Reanimated 가 얼려 버려 위 줄이 소리 없이 무시된다
  if (__DEV__ && colors.background !== palette.background) {
    console.warn('[theme] colors 가 바뀌지 않았다 — worklet 안에서 colors 를 직접 읽는 곳이 있는지 확인');
  }
  const table = scheme === 'dark' ? DARK_CATEGORY : LIGHT_CATEGORY;
  for (const k of Object.keys(table)) categoryColors[k] = { ...table[k] };
}

/**
 * StyleSheet.create 대신 쓴다 — 색이 바뀌면 다음에 읽을 때 새 색으로 다시 만든다.
 *
 * StyleSheet.create 는 파일을 처음 읽을 때 한 번 만들어져서 다크 모드로 바꿔도 옛 색이 남는다.
 * 그래서 만드는 법(factory)을 들고 있다가, 색이 바뀐 뒤 처음 읽힐 때 다시 만든다.
 */
export function themedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: () => T & StyleSheet.NamedStyles<any>
): T {
  let cache = factory();
  let made = version;
  return new Proxy({} as T, {
    get(_t, key) {
      if (made !== version) {
        cache = factory();
        made = version;
      }
      return (cache as Record<string | symbol, unknown>)[key];
    },
    ownKeys() {
      return Reflect.ownKeys(cache);
    },
    getOwnPropertyDescriptor(_t, key) {
      return Object.getOwnPropertyDescriptor(cache, key);
    },
  });
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * 타이포그래피.
 *
 * ⚠️ lineHeight 는 fontSize 의 1.5배 이상으로 잡는다.
 * 한글은 받침 때문에 영문보다 세로 공간을 더 먹는데, iOS 는 지정한 lineHeight 로
 * 글자를 정확히 잘라낸다. (웹·안드로이드는 알아서 늘려주므로 이 버그가 안 보인다)
 * 1.45배로 잡았다가 아이폰에서 필터 칩 글자가 위아래로 잘렸다.
 */
export const typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 20, fontWeight: '700' as const, lineHeight: 30 },
  h3: { fontSize: 17, fontWeight: '700' as const, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },
  captionBold: { fontSize: 13, fontWeight: '600' as const, lineHeight: 20 },
  tiny: { fontSize: 11, fontWeight: '500' as const, lineHeight: 17 },
} as const;

/** 카드에 공통으로 쓰는 그림자. 안드로이드는 elevation 으로 대응. */
export const shadow = {
  card: {
    shadowColor: '#8B6F5C',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
