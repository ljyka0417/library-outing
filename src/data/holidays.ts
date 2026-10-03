import generated from './holidays.generated.json';

/**
 * 공휴일 (한국천문연구원 특일 정보, npm run collect-holidays 로 올해·내년치를 받아 둔다).
 * 대체공휴일·임시공휴일·선거일도 API 가 알려 주는 대로 들어 있다.
 * 받아 둔 해가 지나면 공휴일을 모르는 것으로 보고 평소 요일대로 판정한다(지어내지 않는다).
 */
const DATES = (generated as { dates: Record<string, string> }).dates;

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 그날이 공휴일이면 이름("개천절", "설날", "대체공휴일" …), 아니면 undefined */
export function holidayName(date: Date): string | undefined {
  return DATES[key(date)];
}
