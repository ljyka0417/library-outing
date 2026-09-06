/**
 * 도서관 실사진 등록소.
 *
 * ─────────────────────────────────────────────────────────────
 * 사진을 넣는 방법
 * ─────────────────────────────────────────────────────────────
 *   1) assets/libraries/ 에 `{도서관id}.jpg` 로 저장
 *      (id 는 src/data/libraries.mock.ts 의 SEEDS 참고. 예: seoul-library.jpg)
 *   2) 아래 PHOTOS 에 한 줄 추가
 *   3) 끝. 카드·상세 화면이 자동으로 실사진을 씁니다.
 *
 * 등록되지 않은 도서관은 달곰이 브랜드 플레이스홀더가 나옵니다.
 * 아무 사진이나 채워 넣는 것보다 낫습니다 — 앱스토어에 올릴 앱이 엉뚱한
 * 건물 사진을 "그 도서관"인 양 보여주면 안 되니까요.
 *
 * ─────────────────────────────────────────────────────────────
 * 사진을 구하는 경로 (저작권 확인 필수)
 * ─────────────────────────────────────────────────────────────
 *   ○ 직접 촬영 — 가장 확실합니다. 랜드마크 20곳만이라도 큰 차이가 납니다.
 *   ○ 도서관에 요청 — 공공도서관은 홍보용 사진 제공에 대체로 협조적입니다.
 *                    "앱에 소개하고 싶다"고 메일 보내면 회신받을 수 있습니다.
 *   ○ 공공누리(KOGL) 제1·2유형 — 출처 표시하면 상업적 이용 가능.
 *                    각 지자체·기관 사이트에서 유형 표시를 확인하세요.
 *   ○ Wikimedia Commons — CC 라이선스. 출처·라이선스 표기 의무를 지키세요.
 *
 *   ✗ 도서관 홈페이지 사진 무단 사용 — 공공누리 표시가 없으면 안 됩니다.
 *   ✗ 지도앱 장소 사진 스크래핑 — 약관 위반입니다.
 *   ✗ Unsplash 등의 "도서관스러운" 사진 — 그 도서관이 아니면 사용자를 속이는 겁니다.
 *
 * 사진 출처를 표기해야 하는 라이선스라면 credits 에 적어 주세요.
 * 앱의 [마이 > 사진 출처] 에 모아 보여줄 수 있습니다.
 */

export interface LibraryPhoto {
  /** require() 결과 */
  source: number;
  /** 출처 표기가 필요한 경우 (공공누리, CC 등) */
  credit?: string;
}

export const PHOTOS: Record<string, LibraryPhoto> = {
  // 예시 — assets/libraries/seoul-library.jpg 를 넣은 뒤 주석을 푸세요
  // 'seoul-library': {
  //   source: require('../../assets/libraries/seoul-library.jpg'),
  //   credit: '서울도서관 제공',
  // },
};

export function getPhoto(libraryId: string): LibraryPhoto | undefined {
  return PHOTOS[libraryId];
}

/** 출처 표기가 필요한 사진 목록 (크레딧 화면용) */
export function photoCredits(): { libraryId: string; credit: string }[] {
  return Object.entries(PHOTOS)
    .filter(([, p]) => p.credit)
    .map(([libraryId, p]) => ({ libraryId, credit: p.credit! }));
}
