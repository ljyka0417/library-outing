import { LOAN_PROXY_URL } from '@/config/loanProxy';
import type { Coordinates } from '@/types';

/**
 * 도서관 근처 지하철역 (카카오, 중계 서버 /subway 경유) — 전국. 역이 없는 곳은 빈 목록.
 * live: 노선·방향별 다음 열차 — 수도권은 실시간(kind live), 그 밖은 시간표(kind schedule). 실패하면 null — 화면은 칸을 숨긴다.
 */
export interface SubwayLive {
  line: string;
  /** "을지로입구방면" */
  dir: string;
  /** "성수행" */
  to: string;
  /** 몇 분 뒤 (모르면 null — msg 를 그대로 보여 준다) */
  min: number | null;
  msg: string;
  /** 같은 방향끼리 묶는 이름 */
  group?: string;
  /** 열차가 지금 있는 역 (실시간만) */
  at?: string;
  express?: boolean;
  /** 막차 */
  last?: boolean;
  /** 열차 번호 */
  no?: string;
  /** 이 방향 머리말 — 종착역 ("중앙보훈병원" · "소요산·광운대" · "내선순환") */
  toward?: string;
}
export interface SubwayStation {
  /** "시청" (역 글자 없이) */
  name: string;
  lines: string[];
  dist: number;
  live: SubwayLive[] | null;
  kind?: 'live' | 'schedule' | null;
}

export async function fetchSubway(at: Coordinates): Promise<SubwayStation[] | null> {
  if (!LOAN_PROXY_URL) return null;
  try {
    const res = await fetch(`${LOAN_PROXY_URL.replace(/\/$/, '')}/subway?lat=${at.lat}&lng=${at.lng}`, {
      signal: AbortSignal.timeout?.(10000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { stations?: SubwayStation[] };
    return Array.isArray(body.stations) ? body.stations : null;
  } catch {
    return null;
  }
}
