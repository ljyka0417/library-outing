import generated from './parking.generated.json';
import type { Coordinates } from '@/types';

/**
 * 도서관 근처(800m) 주차장 — 전국주차장정보표준데이터 (npm run collect-parking).
 * 127곳 중 근처에 등록된 주차장이 있는 곳만 있다. 없는 곳은 칸을 그리지 않는다.
 * 이름·주소·요금은 지자체가 올린 원문 그대로다.
 */
export interface ParkingLot {
  name: string;
  /** 공영 · 민영 */
  se?: string;
  /** 노상 · 노외 · 부설 */
  type?: string;
  spaces?: number;
  /** 무료 · 유료 · 혼합 */
  fee?: string;
  basicTime?: number;
  basicCharge?: number;
  addTime?: number;
  addCharge?: number;
  /** "08:00-22:00" */
  weekday?: string;
  phone?: string;
  address?: string;
  coords: Coordinates;
  /** 도서관에서 m */
  distance: number;
}

const BY_LIBRARY = (generated as unknown as { byLibrary: Record<string, ParkingLot[]> }).byLibrary;

export function parkingFor(libraryId: string): ParkingLot[] {
  return BY_LIBRARY[libraryId] ?? [];
}
