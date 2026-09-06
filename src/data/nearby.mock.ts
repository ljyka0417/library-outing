import type { NearbyPlace, NearbyType } from '@/types';
import { MOCK_LIBRARIES } from './libraries.mock';

/**
 * ⚠️ 샘플(mock) 데이터입니다 — 실존 업소가 아닙니다.
 *
 * 실 연동 시에는 카카오 로컬 API(키워드/카테고리 검색)를 도서관 좌표 기준
 * 반경 1~2km 로 호출해 이 구조로 정규화하세요. (src/api/nearbyApi.ts 참고)
 *   - 맛집  → category_group_code=FD6
 *   - 카페  → category_group_code=CE7
 *   - 문화  → category_group_code=CT1
 *
 * 여기서는 도서관 좌표에 작은 오프셋을 더해 "그럴듯한" 주변 장소를 생성합니다.
 */

const NAME_POOL: Record<NearbyType, { name: string; sub: string; note: string }[]> = {
  restaurant: [
    { name: '온기식당', sub: '한식 백반', note: '점심 시간엔 줄이 깁니다. 12시 전에 가세요.' },
    { name: '골목 손칼국수', sub: '칼국수', note: '면을 직접 밀어 내는 노포.' },
    { name: '책방옆 파스타', sub: '이탈리안', note: '혼밥하기 편한 바 좌석이 있어요.' },
    { name: '도담 돈까스', sub: '경양식', note: '아이 동반 가족에게 인기.' },
    { name: '소담 김밥', sub: '분식', note: '포장해서 도서관 앞 벤치에서 먹기 좋아요.' },
    { name: '해뜰 국밥', sub: '국밥', note: '아침 일찍부터 문을 엽니다.' },
  ],
  cafe: [
    { name: '한 페이지 커피', sub: '로스터리 카페', note: '콘센트 자리가 많아 오래 앉기 좋아요.' },
    { name: '고요 다방', sub: '조용한 카페', note: '대화 소리가 낮은, 책 읽기 좋은 곳.' },
    { name: '베이크 앤 북', sub: '베이커리 카페', note: '오후 3시에 스콘이 나옵니다.' },
    { name: '창가자리', sub: '디저트 카페', note: '창 밖으로 도서관이 보이는 자리 추천.' },
    { name: '느린 오후', sub: '차 전문점', note: '커피를 안 마시는 분께.' },
    { name: '노트북 환영 카페', sub: '스터디 카페', note: '노트북 사용 가능, 4시간 제한.' },
  ],
  culture: [
    { name: '시립미술관 분관', sub: '전시관', note: '도서관 관람권 제시 시 할인.' },
    { name: '근린 문화공원', sub: '공원', note: '돗자리 펴고 책 읽기 좋은 잔디밭.' },
    { name: '작은 영화관', sub: '독립영화관', note: '주말 오전 상영은 대체로 한산합니다.' },
    { name: '옛 골목 역사관', sub: '역사관', note: '무료 입장, 해설은 매시 정각.' },
    { name: '공예 체험공방', sub: '체험공방', note: '당일 예약도 가능한 원데이 클래스.' },
    { name: '동네 책방 서재', sub: '독립서점', note: '도서관에 없는 독립출판물을 만날 수 있어요.' },
  ],
};

const TYPES: NearbyType[] = ['restaurant', 'cafe', 'culture'];

/** 위경도에 약 100~600m 정도의 오프셋을 주어 주변 좌표를 만든다. */
function offset(base: number, step: number) {
  return base + step * 0.0018;
}

/**
 * 좌표가 있는 도서관에만 주변 장소를 만든다.
 * 좌표가 없는 곳은 화면에서 "주변 정보가 아직 준비되지 않았어요" 빈 상태로 처리된다.
 * (없는 위치를 지어내서 엉뚱한 동네 맛집을 보여주는 것보다 낫다)
 */
export const MOCK_NEARBY: NearbyPlace[] = MOCK_LIBRARIES.filter((lib) => lib.coords).flatMap(
  (lib, libIdx) =>
    TYPES.flatMap((type) =>
      // 도서관마다 타입별 3곳씩
      Array.from({ length: 3 }, (_, i) => {
        // 위 filter 로 좌표 있는 곳만 남았지만 타입상으로는 optional 이라 좁혀 준다.
        const base = lib.coords!;
        const poolIdx = (libIdx + i * 2) % NAME_POOL[type].length;
        const entry = NAME_POOL[type][poolIdx];
        const dir = i - 1; // -1, 0, 1
        const area = [lib.region.sido, lib.region.sigungu].filter(Boolean).join(' ');

        return {
          id: `${lib.id}-${type}-${i}`,
          libraryId: lib.id,
          type,
          name: entry.name,
          subCategory: entry.sub,
          address: `${area} 일대`,
          coords: {
            lat: offset(base.lat, dir),
            lng: offset(base.lng, i === 1 ? 1 : dir),
          },
          distanceMeters: 180 + i * 220 + libIdx * 7,
          // 사진은 넣지 않는다. 카드가 종류별 색·아이콘으로 그린다.
          note: entry.note,
        } satisfies NearbyPlace;
      })
    )
);
