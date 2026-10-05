import { LOAN_PROXY_URL } from '@/config/loanProxy';
import type { Coordinates } from '@/types';

/**
 * 도서관 근처 버스 정류장과 실시간 도착 (국토교통부 TAGO, 중계 서버 /bus 경유).
 * 서울은 TAGO 에 없어 빈 목록이 온다. 실패하면 null — 화면은 칸을 숨긴다.
 */
export interface BusArrival {
  route: string;
  /** 몇 분 뒤 */
  min: number;
  /** 몇 정거장 전 */
  prev: number;
  /** 저상버스 · 일반차량 … (원문) */
  type?: string;
  /** 노선 종류 — 번호를 그 색으로 (서울 버스 색) */
  kind?: 'trunk' | 'branch' | 'circle' | 'express' | 'village' | 'airport' | 'other';
  /** 종점 쪽 — "대방역" (서울만) */
  toward?: string;
  /** 그다음 버스 몇 분 뒤 */
  next?: number;
  /** 막차 */
  last?: boolean;
}
export interface BusStop {
  name: string;
  /** 정류장 번호 — 길 양쪽 정류장 이름이 같을 때 구분한다 */
  no?: string;
  /** 도서관에서 m */
  dist: number;
  /** null = 도착 정보를 받지 못함 ("도착 예정 없음"과 다르다) */
  arrivals: BusArrival[] | null;
}

export interface BusInfo {
  stops: BusStop[];
  /** 서울은 서울시 버스정보, 나머지는 국토교통부 TAGO */
  source: 'seoul' | 'tago';
}

export async function fetchBus(at: Coordinates): Promise<BusInfo | null> {
  if (!LOAN_PROXY_URL) return null;
  try {
    const res = await fetch(`${LOAN_PROXY_URL.replace(/\/$/, '')}/bus?lat=${at.lat}&lng=${at.lng}`, {
      signal: AbortSignal.timeout?.(10000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { stops?: BusStop[]; source?: string };
    return Array.isArray(body.stops) ? { stops: body.stops, source: body.source === 'seoul' ? 'seoul' : 'tago' } : null;
  } catch {
    return null;
  }
}
