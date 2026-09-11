import { translate, type Lang } from '@/i18n';
import type { OperatingHours } from '@/types';

/**
 * "지금 운영중" 판정.
 *
 * byDay 가 비어 있는(파싱 실패한) 도서관은 판정하지 않고 null 을 반환한다.
 * 화면에서는 null 일 때 뱃지를 아예 숨겨서, 틀린 정보를 단정적으로 보여주지 않는다.
 */
export function isOpenNow(hours: OperatingHours | undefined, now = new Date()): boolean | null {
  if (!hours?.byDay || hours.byDay.length !== 7) return null;

  const today = hours.byDay[now.getDay()];
  if (today === null) return false; // 휴관일

  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= today.open && minutes < today.close;
}

/**
 * 오늘의 운영시간 문구. 휴관이면 안내 문구를 돌려준다.
 *
 * hours.label 은 수집한 원문("화~금 09:00~21:00")이라 옮기지 않는다.
 * 우리가 지어 붙이는 말만 화면에 쓰는 언어를 따라간다.
 */
export function todayHoursLabel(
  hours: OperatingHours | undefined,
  lang: Lang = 'ko',
  now = new Date()
): string {
  if (!hours) return translate(lang, 'hours.unknown');
  const today = hours.byDay?.[now.getDay()];
  if (today === undefined) return hours.label;
  if (today === null) return translate(lang, 'hours.closedToday');
  return translate(lang, 'hours.today', {
    from: formatMinutes(today.open),
    to: formatMinutes(today.close),
  });
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** 거리(m) 를 사람이 읽는 형태로 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** 도보 소요시간 추정 (성인 보행 속도 약 67m/분) */
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 67));
}
