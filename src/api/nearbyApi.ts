import type { Coordinates, NearbyPlace, NearbyType } from '@/types';
import { MOCK_NEARBY } from '@/data/nearby.mock';
import generated from '@/data/nearby.generated.json';
import tourPhotos from '@/data/tour-photos.generated.json';
import { delay } from './config';

/**
 * 도서관 주변 장소.
 *
 * ⚠️ 앱은 카카오 API 를 직접 호출하지 않는다.
 *
 * 호출하려면 REST 키를 앱 번들에 넣어야 하는데(EXPO_PUBLIC_*), 그러면 앱을 뜯어
 * 키를 꺼낼 수 있다. 주변 맛집·카페는 실시간 정보가 아니므로 빌드 타임에 한 번
 * 수집해 JSON 으로 넣어 두는 편이 모든 면에서 낫다:
 *   - 키가 앱에 들어가지 않음
 *   - API 호출이 수집 시 396회로 끝남 (사용자 수와 무관)
 *   - 오프라인에서도 보이고, 로딩이 없음
 *
 * 데이터 갱신:  npm run collect-nearby
 */

interface GeneratedPlace {
  id: string;
  libraryId: string;
  type: string;
  name: string;
  subCategory: string;
  address: string;
  coords: Coordinates;
  distanceMeters: number;
  placeUrl?: string;
}

const byLibrary = (generated as { byLibrary?: Record<string, GeneratedPlace[]> }).byLibrary ?? {};
const hasGenerated = Object.keys(byLibrary).length > 0;

/**
 * 한국관광공사에서 모은 "사진 있는 주변 장소".
 *
 * 카카오 목록을 대체하지 않고 **보탠다.** 관광공사에는 등록된 관광지와
 * 업소만 있어서 동네 구내식당 같은 곳이 빠지고, 카카오에는 사진이 없다.
 * 둘을 합치면 사진 있는 곳이 앞에 서고 나머지가 뒤를 채운다.
 *
 * 사진에는 출처 표기 의무가 있다 (공공누리 제1·3유형).
 * 수집은 scripts/collect-tour-photos.mjs 가 한다 — npm run collect-tour
 */
interface TourPlace extends GeneratedPlace {
  imageUrl: string;
  credit: string;
}
const tourByLibrary =
  (tourPhotos as { byLibrary?: Record<string, TourPlace[]> }).byLibrary ?? {};

export interface NearbyApi {
  list(libraryId: string, coords: Coordinates, type: NearbyType): Promise<NearbyPlace[]>;
}

export const nearbyApi: NearbyApi = {
  async list(libraryId, _coords, type) {
    // 수집 전에는 mock 으로 떨어져서 화면 흐름을 계속 볼 수 있게 한다.
    if (!hasGenerated) {
      await delay();
      return MOCK_NEARBY.filter((p) => p.libraryId === libraryId && p.type === type);
    }

    /*
     * 사진 있는 곳(관광공사)을 앞에, 나머지(카카오)를 뒤에 놓는다.
     * 같은 곳이 양쪽에 있으면 이름이 겹치므로 한 번만 남긴다.
     */
    const withPhoto = (tourByLibrary[libraryId] ?? []).filter((p) => p.type === type);
    const seen = new Set(withPhoto.map((p) => p.name.replace(/\s/g, '')));
    const rest = (byLibrary[libraryId] ?? []).filter(
      (p) => p.type === type && !seen.has(p.name.replace(/\s/g, ''))
    );

    return [...withPhoto, ...rest]
      .map((p) => ({
        id: p.id,
        libraryId: p.libraryId,
        type: p.type as NearbyType,
        name: p.name,
        subCategory: p.subCategory,
        address: p.address,
        coords: p.coords,
        distanceMeters: p.distanceMeters,
        placeUrl: p.placeUrl,
        /*
         * 사진은 관광공사에서 온 것만 있다.
         *
         * 카카오 로컬 API 는 장소 사진을 주지 않는다. 응답 항목 열두 개에
         * 이미지가 아예 없다 — 지도 앱에서 보이는 가게 사진은 업주·이용자가
         * 올린 것이라 카카오가 외부에 내줄 권리가 없기 때문이다. 네이버도 같다.
         */
        imageUrl: (p as Partial<TourPlace>).imageUrl,
        credit: (p as Partial<TourPlace>).credit,
      }));
  },
};

/** 수집된 주변 정보가 있는지. 개발 중 상태 확인용. */
export const nearbyDataStatus = {
  generated: hasGenerated,
  libraryCount: Object.keys(byLibrary).length,
  placeCount: Object.values(byLibrary).reduce((n, arr) => n + arr.length, 0),
};
