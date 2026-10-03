import { LOAN_PROXY_URL } from '@/config/loanProxy';
import type { Coordinates } from '@/types';

/**
 * 지금 날씨 (기상청 초단기실황, 중계 서버 /weather 경유 — 기상청 키는 서버에만 있다).
 * 실패하면 null. 화면은 날씨 칸을 조용히 숨긴다 — 모르는 날씨를 지어내지 않는다.
 */
export type WeatherCondition = 'clear' | 'partly' | 'cloudy' | 'rain' | 'sleet' | 'snow';

export interface Weather {
  condition: WeatherCondition;
  /** 기온 °C */
  temp?: number;
  /** 지난 한 시간 강수량 mm */
  rain1h?: number;
  humidity?: number;
  wind?: number;
  /** 관측 시각 (한국 시각, ISO) */
  observedAt: string;
}

const MEMO_MS = 10 * 60 * 1000;
const memo = new Map<string, { at: number; value: Weather }>();

export const weatherEnabled = Boolean(LOAN_PROXY_URL);

export async function fetchWeather(coords: Coordinates): Promise<Weather | null> {
  if (!LOAN_PROXY_URL) return null;
  // 같은 기상청 격자(약 5km)면 같은 날씨라, 소수 둘째 자리(약 1km)로 묶어 기억한다
  const key = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `${LOAN_PROXY_URL.replace(/\/$/, '')}/weather?lat=${coords.lat}&lng=${coords.lng}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const value = (await res.json()) as Weather;
    if (!value?.condition) return null;
    memo.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 날씨에 맞춰 달곰이가 권하는 말의 종류 */
export type WeatherMood = 'wet' | 'snow' | 'hot' | 'cold' | 'nice' | 'cloudy';

export function weatherMood(w: Weather): WeatherMood {
  if (w.condition === 'snow' || w.condition === 'sleet') return 'snow';
  if (w.condition === 'rain') return 'wet';
  if (w.temp !== undefined && w.temp >= 30) return 'hot';
  if (w.temp !== undefined && w.temp <= 2) return 'cold';
  if (w.condition === 'cloudy') return 'cloudy';
  return 'nice';
}

/** 날씨 그림 (Ionicons) */
export const WEATHER_ICON: Record<WeatherCondition, 'sunny' | 'partly-sunny' | 'cloudy' | 'rainy' | 'snow'> = {
  clear: 'sunny',
  partly: 'partly-sunny',
  cloudy: 'cloudy',
  rain: 'rainy',
  sleet: 'rainy',
  snow: 'snow',
};
