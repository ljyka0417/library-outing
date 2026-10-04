import { LOAN_PROXY_URL } from '@/config/loanProxy';
import type { Coordinates } from '@/types';

/**
 * 도서관 근처 공연·전시 (한국문화정보원 한눈에보는문화정보, 중계 서버 /culture 경유 — 키는 서버에만 있다).
 * 오늘 열려 있거나 두 달 안에 시작하는 행사만, 가까운 순. 실패하면 null — 화면은 칸을 숨긴다.
 */
export interface CultureEvent {
  seq: string;
  title: string;
  kind: 'show' | 'exhibit' | 'other';
  /** 갈래 (연극·전시·음악/콘서트 …, 원문 한국어) */
  realm?: string;
  /** YYYY-MM-DD */
  start?: string;
  end?: string;
  place?: string;
  thumb?: string;
  lat: number;
  lng: number;
  /** 도서관에서 떨어진 거리 (m) */
  dist: number;
}

export interface CultureEventDetail {
  price?: string;
  url?: string;
  phone?: string;
  placeAddr?: string;
  placeUrl?: string;
}

/** 걸어서 30분쯤 */
export const CULTURE_RADIUS = 2000;

const base = () => (LOAN_PROXY_URL ?? '').replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T | null> {
  if (!LOAN_PROXY_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base()}${path}`, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 같은 자리를 10분 안에 또 물으면 서버에 다시 묻지 않는다 (달곰이가 말을 바꿔 다시 답할 때 등) */
const eventsMemo = new Map<string, { at: number; events: CultureEvent[] }>();

export async function fetchNearbyEvents(coords: Coordinates): Promise<CultureEvent[] | null> {
  const key = `${coords.lat},${coords.lng}`;
  const hit = eventsMemo.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.events;
  const body = await getJson<{ events?: CultureEvent[] }>(
    `/culture?lat=${coords.lat}&lng=${coords.lng}&r=${CULTURE_RADIUS}`
  );
  if (!Array.isArray(body?.events)) return null;
  eventsMemo.set(key, { at: Date.now(), events: body!.events });
  return body!.events;
}

const detailMemo = new Map<string, CultureEventDetail>();

export async function fetchEventDetail(seq: string): Promise<CultureEventDetail | null> {
  const hit = detailMemo.get(seq);
  if (hit) return hit;
  const body = await getJson<CultureEventDetail & { error?: string }>(`/culture/detail?seq=${encodeURIComponent(seq)}`);
  if (!body || body.error) return null;
  detailMemo.set(seq, body);
  return body;
}

/** 오늘(기기 시각, YYYY-MM-DD) 열려 있는 행사인지 */
export function isOngoing(e: CultureEvent, today: string): boolean {
  return !!e.start && e.start <= today && (!e.end || e.end >= today);
}

/**
 * 이 도서관 안에서 열리는 행사인지 — 장소 이름에 도서관 이름이 들어 있을 때만.
 * 거리만으로는 정하지 않는다 (바로 옆 공연장을 도서관 행사로 말하게 된다).
 */
export function isAtLibrary(e: CultureEvent, libraryName: string): boolean {
  const squash = (s: string) => s.replace(/\s+/g, '');
  return !!e.place && squash(e.place).includes(squash(libraryName));
}
