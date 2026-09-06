/**
 * 디자인 토큰
 *
 * 톤앤매너: 파스텔 민트 + 베이지 + 브라운.
 * 가이드북(종이책)의 따뜻한 질감을 앱에서도 이어가기 위해 순백(#FFF) 대신
 * 살짝 미색이 도는 배경을 기본으로 쓴다.
 */

export const colors = {
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
} as const;

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
 * types 의 CategoryId 12종과 키가 1:1로 대응해야 한다.
 */
export const categoryColors: Record<string, { bg: string; fg: string }> = {
  landmark: { bg: '#E3F2EE', fg: '#3F8E7E' },
  kids: { bg: '#FFF1DC', fg: '#C98A3C' },
  language: { bg: '#E6F0FB', fg: '#3F7CB8' },
  music: { bg: '#FDE8EC', fg: '#C9536B' },
  art: { bg: '#FBE9E1', fg: '#C46B47' },
  history: { bg: '#F1EBE2', fg: '#8B6F5C' },
  nature: { bg: '#E4F3E6', fg: '#4C8F5A' },
  science: { bg: '#E9E7FB', fg: '#6B5FC4' },
  comics: { bg: '#FBE7F3', fg: '#B4508C' },
  food: { bg: '#FDF0DC', fg: '#B98A33' },
  travel: { bg: '#E0F0F5', fg: '#3C8296' },
  humanities: { bg: '#EFEDE7', fg: '#6F6A5E' },
};

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
