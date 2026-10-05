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

import generated from './library-photos.generated.json';
import extraJson from './library-photos.extra.json';

export interface LibraryPhoto {
  /** 앱에 넣어 둔 사진 — require() 결과 */
  source?: number;
  /** 인터넷에서 불러오는 사진 (관광공사) */
  uri?: string;
  /** 출처 표기가 필요한 경우 (공공누리, CC 등) */
  credit?: string;
}

export const PHOTOS: Record<string, LibraryPhoto> = {
  // 만든 사람이 직접 찍은 사진 — 저작권이 우리에게 있어 출처 표기가 필요 없다
  'dongjak-english': { source: require('../../assets/libraries/dongjak-english.jpg') },
  // 예시 — assets/libraries/seoul-library.jpg 를 넣은 뒤 주석을 푸세요
  // 'seoul-library': {
  //   source: require('../../assets/libraries/seoul-library.jpg'),
  //   credit: '서울도서관 제공',
  // },
};

/**
 * 한국관광공사에서 찾은 도서관 실사진.
 *
 * 우리 목록 중 일부는 관광공사에 "문화시설" 로 등록되어 있어서, 공사가
 * 저작권을 확보한 사진을 API 로 내려준다. 그 도서관의 진짜 사진을 합법적으로
 * 쓸 수 있는 셈이다.
 *
 * 엉뚱한 건물이 붙지 않도록 **이름이 닮은 것만으로는 받아들이지 않는다.**
 * 우리가 아는 좌표에서 가까운 것만 남긴다. 「중앙도서관」 같은 이름은 전국에
 * 널려 있어서, 이름만 보면 다른 도시 도서관 사진이 붙는다.
 *
 * 수집: npm run collect-library-photos
 */
const remote = (generated as { byId?: Record<string, RemotePhoto> }).byId ?? {};

/**
 * 관광공사 이름 검색이 못 찾은 곳 — 관광공사 위치 검색과 위키미디어 공용(사람이 확인한 파일).
 * 공용 사진은 지은이·라이선스(CC BY-SA 등)를 credit 에 함께 적는다. 수집: npm run collect-more-library-photos
 */
const extra = (extraJson as { byId?: Record<string, { url: string; credit: string }> }).byId ?? {};

/**
 * 위키미디어 공용 사진은 앱 안에 넣어 둔 것을 쓴다 (assets/libraries/commons, 960px).
 *
 * 인터넷 주소로 불러왔더니 위키미디어가 안드로이드 앱의 요청을 403 으로 거절해서 사진 칸이 하얗게 비었다
 * (이름표 User-Agent 를 붙여도 그대로). 위키미디어는 앱이 사진을 바로 끌어다 쓰는 것을 권하지 않는다.
 * 라이선스(CC0·CC BY-SA·공공누리)는 복사해 넣는 것을 허락하고, 출처 표기는 credit 으로 그대로 한다.
 * 사진을 새로 고르면(collect-more-library-photos) 여기 파일도 함께 받아 넣는다.
 */
const COMMONS_LOCAL: Record<string, number> = {
  'seoul-library': require('../../assets/libraries/commons/seoul-library.jpg'),
  'pangyo-kids': require('../../assets/libraries/commons/pangyo-kids.jpg'),
  'songdo-kids': require('../../assets/libraries/commons/songdo-kids.png'),
  'seonhak-starlight': require('../../assets/libraries/commons/seonhak-starlight.jpg'),
  'jungcheon-philosophy': require('../../assets/libraries/commons/jungcheon-philosophy.jpg'),
  'dongdaejeon-library': require('../../assets/libraries/commons/dongdaejeon-library.jpg'),
  'gyeongju-city': require('../../assets/libraries/commons/gyeongju-city.jpg'),
  'halla-library': require('../../assets/libraries/commons/halla-library.jpg'),
  'unnam-kids': require('../../assets/libraries/commons/unnam-kids.jpg'),
};

interface RemotePhoto {
  url: string;
  credit: string;
  copyright: string;
  matchedTitle: string;
  distanceMeters: number;
}

/**
 * 이 도서관 사진을 돌려준다.
 *
 * 직접 넣은 사진(PHOTOS)이 먼저다. 관광공사 사진보다 우리가 고른 사진이
 * 그 도서관을 더 잘 보여줄 테니까.
 */
export function getPhoto(libraryId: string): LibraryPhoto | undefined {
  if (PHOTOS[libraryId]) return PHOTOS[libraryId];

  const r = remote[libraryId] ?? extra[libraryId];
  if (!r) return undefined;
  if (!remote[libraryId] && COMMONS_LOCAL[libraryId]) return { source: COMMONS_LOCAL[libraryId], credit: r.credit };
  return { uri: secureUrl(r.url), credit: r.credit };
}

/**
 * 사진 주소를 https 로 맞춘다.
 *
 * ⚠️ 아이폰은 http 로 된 사진을 아예 안 불러온다(App Transport Security).
 *   웹에서는 멀쩡히 보이다가 기기에서만 빈칸이 되어 한참 헤맸다.
 *   수집기에서도 맞춰 두지만, 옛 데이터가 남아 있어도 안 깨지도록 여기서
 *   한 번 더 본다. 같은 주소가 https 로도 열린다.
 */
export function secureUrl(url: string): string {
  return url.replace(/^http:\/\//, 'https://');
}

/**
 * <Image source> 에 바로 넣을 값 — 앱에 넣은 사진이면 그대로, 인터넷 사진이면 { uri }.
 * 사진이 없으면 undefined.
 */
export function photoSource(libraryId: string): number | { uri: string } | undefined {
  const p = getPhoto(libraryId);
  if (!p) return undefined;
  if (p.source) return p.source;
  return p.uri ? { uri: p.uri } : undefined;
}

/** 출처 표기가 필요한 사진 목록 (크레딧 화면용) */
export function photoCredits(): { libraryId: string; credit: string }[] {
  return [
    ...Object.entries(PHOTOS).filter(([, p]) => p.credit),
    ...Object.entries(remote),
    ...Object.entries(extra),
  ].map(([libraryId, p]) => ({ libraryId, credit: p.credit! }));
}

/** 실사진이 붙은 도서관 수. 개발 중 상태 확인용. */
export const libraryPhotoCount = new Set([...Object.keys(PHOTOS), ...Object.keys(remote), ...Object.keys(extra)]).size;

/** 위키미디어 공용 사진이 있나 (마이 > 사진 출처에 함께 밝힌다) */
export const hasCommonsPhotos = Object.values(extra).some((p) => /Wikimedia Commons/.test(p.credit));

/** 실사진이 있는 도서관 id (달곰이 꾸미기의 도서관 배경) */
export const photoLibraryIds = [...new Set([...Object.keys(PHOTOS), ...Object.keys(remote), ...Object.keys(extra)])];
