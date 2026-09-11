import type { Coordinates, NearbyPlace, NearbyType } from '@/types';
import { MOCK_NEARBY } from '@/data/nearby.mock';
import generated from '@/data/nearby.generated.json';
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

    const places = byLibrary[libraryId] ?? [];
    return places
      .filter((p) => p.type === type)
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
         * 카카오 로컬 API 는 사진을 주지 않는다. 응답 항목 열두 개에 이미지가
         * 아예 없다 — 지도 앱에서 보이는 가게 사진은 업주·이용자가 올린 것이라
         * 카카오가 외부에 내줄 권리가 없기 때문이다. 네이버도 같다.
         *
         * 그래서 사진을 가져오는 대신 **사진이 있는 곳으로 보낸다.**
         * 카드를 누르면 위 placeUrl(카카오 장소 페이지)이 열린다.
         */
        imageUrl: undefined,
      }));
  },
};

/** 수집된 주변 정보가 있는지. 개발 중 상태 확인용. */
export const nearbyDataStatus = {
  generated: hasGenerated,
  libraryCount: Object.keys(byLibrary).length,
  placeCount: Object.values(byLibrary).reduce((n, arr) => n + arr.length, 0),
};
