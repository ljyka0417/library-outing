import { LOAN_PROXY_URL } from '@/config/loanProxy';
import type { Coordinates } from '@/types';
import type { Lang } from '@/i18n';
import { readableName } from '@/utils/romanize';
import { currentScheme } from '@/theme';

/**
 * 지금 미세먼지 (에어코리아, 중계 서버 /air 경유 — 그 자리에서 가장 가까운 측정소).
 * 실패하면 null. 화면은 미세먼지 칸을 조용히 숨긴다 — 모르는 공기를 지어내지 않는다.
 */
export type AirGrade = 1 | 2 | 3 | 4;

export interface Air {
  /** 측정소 이름 (한국어 원문) */
  station: string;
  /** 측정소까지 km */
  distance: number;
  /** "2026-10-04 02:00" (한국 시각) */
  dataTime?: string;
  /** ㎍/㎥ */
  pm10?: number;
  pm25?: number;
  pm10Grade?: AirGrade;
  pm25Grade?: AirGrade;
  /** 둘 중 나쁜 쪽 */
  grade: AirGrade;
}

/** 등급 색 — 우리나라 대기 정보에서 흔히 쓰는 차례(좋음 파랑 · 보통 초록 · 나쁨 주황 · 매우나쁨 빨강) */
const AIR_LIGHT: Record<AirGrade, { bg: string; fg: string }> = {
  1: { bg: '#E3EEFB', fg: '#2F6FC0' },
  2: { bg: '#E3F2E6', fg: '#2E8B57' },
  3: { bg: '#FDEBD8', fg: '#C46A12' },
  4: { bg: '#FBE0DE', fg: '#C0392B' },
};
const AIR_DARK: Record<AirGrade, { bg: string; fg: string }> = {
  1: { bg: '#1D2B3D', fg: '#7FB2EE' },
  2: { bg: '#1C3324', fg: '#6FCB93' },
  3: { bg: '#3A2A17', fg: '#F0A45C' },
  4: { bg: '#3D1F1C', fg: '#F08A7E' },
};
/** 다크 모드에서는 어두운 판에 밝은 글자 */
export const AIR_COLOR = new Proxy(AIR_LIGHT, {
  get: (_t, k) => (currentScheme() === 'dark' ? AIR_DARK : AIR_LIGHT)[k as unknown as AirGrade],
});

const MEMO_MS = 15 * 60 * 1000;
const memo = new Map<string, { at: number; value: Air }>();

export const airEnabled = Boolean(LOAN_PROXY_URL);

export async function fetchAir(coords: Coordinates): Promise<Air | null> {
  if (!LOAN_PROXY_URL) return null;
  const key = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${LOAN_PROXY_URL.replace(/\/$/, '')}/air?lat=${coords.lat}&lng=${coords.lng}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const value = (await res.json()) as Air;
    if (!value?.grade || value.grade < 1 || value.grade > 4) return null;
    memo.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 나쁨 이상이면 실내에 오래 있는 편이 낫다 */
export const airIsBad = (a: Air | null | undefined) => !!a && a.grade >= 3;

/** 측정소 이름 — 한국어 동네 이름이라 외국어 화면에서는 로마자로 읽는 법을 쓴다 (예: 유촌동 → Yuchondong) */
export function stationName(a: Air, lang: Lang): string {
  return lang === 'ko' ? a.station : readableName(a.station, lang) || a.station;
}
