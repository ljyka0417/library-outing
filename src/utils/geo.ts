import type { Coordinates } from '@/types';

/** 두 지점 사이의 거리 (m, 하버사인). 내 주변 지도가 가까운 순으로 늘어놓을 때 쓴다 */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 위치를 모를 때 지도가 처음 보여 줄 곳 — 남한 전체 */
export const KOREA_CENTER: Coordinates = { lat: 36.35, lng: 127.85 };
