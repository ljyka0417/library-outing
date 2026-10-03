import generated from './barrier-free.generated.json';

/**
 * 도서관 무장애 편의 정보 (한국관광공사 무장애 여행 정보, npm run collect-barrier-free).
 * 관광공사에 그 도서관이 실려 있는 곳만 있다(2026-10 기준 127곳 중 20곳). 없는 곳은 칸을 그리지 않는다.
 * 설명 글은 관광공사 원문(한국어) 그대로다.
 */
export type BfField =
  | 'wheelchair' | 'elevator' | 'restroom' | 'parking' | 'exit' | 'route' | 'publictransport' | 'handicapetc'
  | 'braileblock' | 'helpdog' | 'guidehuman' | 'audioguide' | 'bigprint' | 'brailepromotion' | 'guidesystem' | 'blindhandicapetc'
  | 'signguide' | 'videoguide' | 'hearingroom' | 'hearinghandicapetc'
  | 'stroller' | 'lactationroom' | 'babysparechair' | 'infantsfamilyetc';

export type BfGroup = 'physical' | 'visual' | 'hearing' | 'family';

export const BF_GROUPS: Record<BfGroup, BfField[]> = {
  physical: ['wheelchair', 'elevator', 'restroom', 'parking', 'exit', 'route', 'publictransport', 'handicapetc'],
  visual: ['braileblock', 'helpdog', 'guidehuman', 'audioguide', 'bigprint', 'brailepromotion', 'guidesystem', 'blindhandicapetc'],
  hearing: ['signguide', 'videoguide', 'hearingroom', 'hearinghandicapetc'],
  family: ['stroller', 'lactationroom', 'babysparechair', 'infantsfamilyetc'],
};

interface Entry {
  contentId: string;
  title: string;
  info: Partial<Record<BfField, string>>;
}
const BY_LIBRARY = (generated as { byLibrary: Record<string, Entry> }).byLibrary;

export function barrierFreeFor(libraryId: string): Entry['info'] | undefined {
  const info = BY_LIBRARY[libraryId]?.info;
  if (!info) return undefined;
  // 원문이 항목을 밑줄로 잇는다 ("있음(시청 공동)_무장애 편의시설…") — 읽기 좋게 가운뎃점으로만 바꾼다
  return Object.fromEntries(
    Object.entries(info).map(([k, v]) => [k, String(v).replace(/\s*_\s*/g, ' · ')])
  ) as Entry['info'];
}

/** 정보가 있는 도서관 id 들 */
export const barrierFreeLibraryIds = Object.keys(BY_LIBRARY);

/**
 * "없음"이라고 적힌 칸은 있는 것으로 세지 않는다 ("장애인 화장실 없음").
 * 원문은 자세히 보기에서 그대로 보여 준다.
 */
export function bfHas(text?: string): boolean {
  return !!text && !/없음|없습니다|불가|미설치|미비/.test(text);
}

/** 위에 칩으로 보여 줄 대표 항목 (있는 것만) */
export function bfHighlights(info: Entry['info']): ('wheelchair' | 'elevator' | 'restroom' | 'parking' | 'visual' | 'hearing' | 'family')[] {
  const out: ReturnType<typeof bfHighlights> = [];
  if (bfHas(info.wheelchair)) out.push('wheelchair');
  if (bfHas(info.elevator)) out.push('elevator');
  if (bfHas(info.restroom)) out.push('restroom');
  if (bfHas(info.parking)) out.push('parking');
  if (BF_GROUPS.visual.some((f) => bfHas(info[f]))) out.push('visual');
  if (BF_GROUPS.hearing.some((f) => bfHas(info[f]))) out.push('hearing');
  if (BF_GROUPS.family.some((f) => bfHas(info[f]))) out.push('family');
  return out;
}
