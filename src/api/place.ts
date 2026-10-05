import { LOAN_PROXY_URL } from '@/config/loanProxy';

/**
 * 장소 검색 (카카오 키워드 검색, 중계 서버 /place 경유).
 * 내 주변 지도 검색창에서 "강남역" · "해운대" 를 치면 그 자리로 가서 근처 도서관을 보여 준다.
 * 실패하면 null — 화면은 도서관 이름 결과만 보여 준다.
 */
export interface Place {
  name: string;
  address: string;
  /** "수도권2호선" · "해수욕장,해변" */
  category: string;
  lat: number;
  lng: number;
}

export async function searchPlaces(q: string): Promise<Place[] | null> {
  if (!LOAN_PROXY_URL || !q.trim()) return null;
  try {
    const res = await fetch(`${LOAN_PROXY_URL.replace(/\/$/, '')}/place?q=${encodeURIComponent(q.trim())}`, {
      signal: AbortSignal.timeout?.(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { places?: Place[] };
    return Array.isArray(body.places) ? body.places : null;
  } catch {
    return null;
  }
}
