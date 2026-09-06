/**
 * 데이터 소스 설정.
 *
 * .env 의 EXPO_PUBLIC_USE_MOCK 이 'false' 이고 필요한 키가 채워져 있을 때만
 * 실 API 를 호출한다. 키가 없으면 자동으로 mock 으로 폴백하므로,
 * 키 없이도 앱 전체 흐름을 개발/시연할 수 있다.
 */

/**
 * ⚠️ 여기에 API 키를 두지 않는다.
 *
 * EXPO_PUBLIC_ 로 시작하는 환경변수는 앱 번들에 그대로 박혀서, 앱을 뜯으면
 * 누구나 키를 꺼낼 수 있다. 그래서 외부 API 호출은 전부 빌드 타임 스크립트로
 * 옮겼고(scripts/), 앱은 수집 결과 JSON 만 읽는다.
 *
 *   npm run geocode         도서관 좌표·주소     → libraries.geocoded.json
 *   npm run enrich          도서관 상세 (정보나루) → libraries.enriched.json
 *   npm run collect-nearby  주변 맛집·카페        → nearby.generated.json
 *
 * 키는 .env 에 EXPO_PUBLIC_ 접두어 **없이** 두며, 내 PC 에서만 쓰인다.
 */

const env = process.env;

/** 수집 데이터가 비어 있을 때 mock 으로 화면을 채울지 여부 (개발 편의용) */
export const USE_MOCK_LIBRARY = (env.EXPO_PUBLIC_USE_MOCK ?? 'false').toLowerCase() !== 'false';

/** 개발 편의: mock 응답에 인위적인 지연을 줘서 로딩 UI 를 확인한다. */
export const MOCK_LATENCY_MS = 320;

export function delay(ms = MOCK_LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
