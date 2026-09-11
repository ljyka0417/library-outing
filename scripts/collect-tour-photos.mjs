/**
 * 한국관광공사 TourAPI 로 도서관 주변의 "사진 있는 장소" 를 모은다.
 *
 *   npm run collect-tour              랜드마크 20곳만 (처음엔 이걸로)
 *   npm run collect-tour -- --all     132곳 전부
 *   npm run collect-tour -- --limit 5 앞에서 5곳만
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 이걸 따로 모으는가
 * ─────────────────────────────────────────────────────────────
 * 카카오·네이버 지도 API 는 장소 사진을 주지 않는다. 지도 앱에서 보이는
 * 가게 사진은 업주와 이용자가 올린 것이라 두 회사 다 외부에 내줄 권리가
 * 없기 때문이다. 그래서 주변 둘러보기 카드가 색과 아이콘뿐이었다.
 *
 * 관광공사는 다르다. 자기들이 찍거나 저작권을 확보한 사진이라 API 로
 * 내려준다. 대신 등록된 관광지·문화시설·음식점만 있어서, 동네 구내식당
 * 같은 곳은 안 나온다. 그래서 카카오 목록을 **대체하지 않고 보탠다.**
 *
 * ─────────────────────────────────────────────────────────────
 * 저작권
 * ─────────────────────────────────────────────────────────────
 * 사진마다 이용 조건이 다르다. 그래서 목록의 firstimage 를 그냥 쓰지 않고,
 * 장소마다 상세 이미지 정보를 한 번 더 물어 **저작권 유형을 확인한 것만**
 * 남긴다.
 *   Type1  제1유형 (출처 표시)          → 쓴다
 *   Type3  제3유형 (출처 표시 + 변경 금지) → 쓴다. 자르거나 덧칠하지 않는다
 *   그 외 / 표시 없음                    → 버린다
 *
 * 앱스토어에 올릴 앱이라 상업적 이용이 걸린다. 조건을 못 읽은 사진은
 * 안 쓰는 편이 낫다.
 *
 * ─────────────────────────────────────────────────────────────
 * 키
 * ─────────────────────────────────────────────────────────────
 * data.go.kr 은 API 마다 따로 활용신청을 해야 한다. 도서관 쪽으로 받은
 * 키는 관광 API 에서는 "등록되지 않은 서비스키" 가 된다.
 *   1) data.go.kr 로그인
 *   2) "한국관광공사_국문 관광정보 서비스" 검색 → 활용신청
 *   3) 개발계정은 보통 바로 승인된다 (하루 1,000회)
 *   4) 승인된 뒤 .env 의 DATA_GO_KR_KEY 를 그대로 쓰면 된다
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';

const KEY = requireEnv(
  'DATA_GO_KR_KEY',
  'data.go.kr 에서 받은 일반 인증키(Decoding)를 .env 에 넣어 주세요.\n' +
    '  DATA_GO_KR_KEY=발급받은키'
);

const BASE = 'http://apis.data.go.kr/B551011/KorService2';
const COMMON = `MobileOS=ETC&MobileApp=librarymap&_type=json&serviceKey=${encodeURIComponent(KEY)}`;

/** 몇 미터 안을 볼 것인가. 걸어갈 만한 거리로 둔다. */
const RADIUS = 1500;
/** 도서관 한 곳에서 최대 몇 곳까지 남길 것인가 */
const PER_LIBRARY = 6;

/**
 * 관광 타입을 우리 탭으로 옮긴다.
 * 12 관광지 · 14 문화시설 · 15 축제공연행사 · 28 레포츠 · 39 음식점
 * 숙박(32)·쇼핑(38)·여행코스(25) 는 주변 둘러보기와 결이 달라 버린다.
 */
const TYPE_OF = { 12: 'culture', 14: 'culture', 15: 'culture', 28: 'culture', 39: 'restaurant' };
/** 음식점 중에서 카페·전통찻집은 카페 탭으로 */
const CAFE_CAT3 = 'A05020900';

/** 쓸 수 있는 저작권 유형 */
const OK_COPYRIGHT = new Set(['Type1', 'Type3']);

let requests = 0;

async function callApi(op, params) {
  const url = `${BASE}/${op}?${COMMON}&${params}`;
  const res = await fetch(url);
  requests++;
  const text = await res.text();

  /*
   * ⚠️ 키가 틀렸을 때도 HTTP 200 에 JSON 이 온다.
   *   다만 모양이 다르다 — 평소의 response.body 대신 OpenAPI_ServiceResponse
   *   안에 오류가 들어온다. 이걸 안 보면 "결과 0건" 으로 조용히 넘어가서,
   *   키 문제인데 "주변에 사진이 없나 보다" 로 잘못 읽게 된다.
   *   실제로 처음 돌렸을 때 그렇게 빈 파일을 만들고 성공한 척했다.
   */
  const fail = (msg) => {
    console.error(`\n${msg}\n`);
    process.exit(1);
  };

  if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
    fail(
      '키가 관광 API 에 등록되어 있지 않습니다.\n\n' +
        '  data.go.kr 에서 "한국관광공사_국문 관광정보 서비스" 를 찾아 활용신청하세요.\n' +
        '  개발계정은 보통 바로 승인됩니다. 승인 뒤 같은 키로 다시 돌리면 됩니다.'
    );
  }
  if (text.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS')) {
    fail('오늘 호출 한도를 다 썼습니다. 내일 다시 돌리거나 운영계정을 신청하세요.');
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${op}: 응답을 읽지 못했습니다 — ${text.slice(0, 160)}`);
  }

  // 오류 전용 봉투
  const err = json?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (err) {
    fail(
      `관광 API 가 거절했습니다 — ${err.returnAuthMsg ?? ''} (${err.errMsg ?? ''})\n\n` +
        '  키가 이 API 에 등록되어 있는지 data.go.kr 마이페이지에서 확인해 주세요.'
    );
  }

  const header = json?.response?.header;
  if (!header) {
    throw new Error(`${op}: 모르는 모양의 응답입니다 — ${text.slice(0, 160)}`);
  }
  if (header.resultCode && header.resultCode !== '0000') {
    throw new Error(`${op}: ${header.resultCode} ${header.resultMsg ?? ''}`);
  }

  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

/** 도서관 주변에서 사진이 붙어 있는 장소를 찾는다 */
async function nearbyWithPhoto(coords) {
  const items = await callApi(
    'locationBasedList2',
    `numOfRows=50&pageNo=1&mapX=${coords.lng}&mapY=${coords.lat}&radius=${RADIUS}&arrange=S`
  );

  return items
    .filter((it) => it.firstimage && it.firstimage.startsWith('http'))
    .filter((it) => TYPE_OF[Number(it.contenttypeid)])
    .map((it) => ({
      contentId: String(it.contentid),
      contentTypeId: Number(it.contenttypeid),
      name: String(it.title ?? '').trim(),
      address: String(it.addr1 ?? '').trim(),
      coords: { lat: Number(it.mapy), lng: Number(it.mapx) },
      distanceMeters: Math.round(Number(it.dist) || 0),
      image: it.firstimage,
      type:
        Number(it.contenttypeid) === 39 && it.cat3 === CAFE_CAT3
          ? 'cafe'
          : TYPE_OF[Number(it.contenttypeid)],
      subCategoryHint:
        Number(it.contenttypeid) === 39
          ? it.cat3 === CAFE_CAT3
            ? '카페'
            : '음식점'
          : Number(it.contenttypeid) === 14
            ? '문화시설'
            : Number(it.contenttypeid) === 15
              ? '행사'
              : Number(it.contenttypeid) === 28
                ? '레포츠'
                : '관광지',
    }));
}

/**
 * 이 장소의 사진을 써도 되는지 확인한다.
 * 쓸 수 있으면 사진 주소를, 아니면 null 을 돌려준다.
 */
async function usablePhoto(contentId, fallback) {
  const images = await callApi(
    'detailImage2',
    `contentId=${contentId}&imageYN=Y&numOfRows=5&pageNo=1`
  );

  const ok = images.find((im) => OK_COPYRIGHT.has(String(im.cpyrhtDivCd ?? '')));
  if (!ok) return null;

  return {
    url: ok.originimgurl || ok.smallimageurl || fallback,
    copyright: String(ok.cpyrhtDivCd),
  };
}

/* ── 도서관 목록 ─────────────────────────────────────────── */

function readLibraries() {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/libraries.mock.ts'), 'utf8');
  // 한 줄 전체를 잡아 두고 뒷부분에서 landmark 여부를 읽는다.
  // categories: ['landmark'] 와 헷갈리지 않도록 'landmark: true' 로 본다.
  const seeds = [
    ...src.matchAll(/\{ id: '([^']+)', name: '([^']+)', sido: '([^']+)'([^}]*)\}/g),
  ].map((m) => ({
    id: m[1],
    name: m[2],
    sido: m[3],
    landmark: m[4].includes('landmark: true'),
  }));

  const geo = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src/data/libraries.geocoded.json'), 'utf8')
  );
  const entries = geo.entries ?? {};

  return seeds
    .map((s) => ({ ...s, coords: entries[s.id]?.coords }))
    .filter((s) => s.coords && Number.isFinite(s.coords.lat));
}

/* ── 실행 ────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const all = argv.includes('--all');
const limitArg = argv.indexOf('--limit');
const limit = limitArg >= 0 ? Number(argv[limitArg + 1]) : null;

const libraries = readLibraries();
const targets = all
  ? libraries
  : limit
    ? libraries.slice(0, limit)
    : libraries.filter((l) => l.landmark);

if (targets.length === 0) {
  console.error('좌표가 있는 도서관을 찾지 못했습니다. npm run geocode 를 먼저 돌리세요.');
  process.exit(1);
}

console.log(`관광공사 사진 수집 — 도서관 ${targets.length}곳, 반경 ${RADIUS}m\n`);

const byLibrary = {};
let kept = 0;
let droppedByCopyright = 0;

for (let i = 0; i < targets.length; i++) {
  const lib = targets[i];
  process.stdout.write(`  [${i + 1}/${targets.length}] ${lib.name.padEnd(20)}`);

  try {
    const found = await nearbyWithPhoto(lib.coords);
    const places = [];

    for (const spot of found.slice(0, PER_LIBRARY * 2)) {
      if (places.length >= PER_LIBRARY) break;
      const photo = await usablePhoto(spot.contentId, spot.image);
      await sleep(120);
      if (!photo) {
        droppedByCopyright++;
        continue;
      }
      places.push({
        id: `tour-${spot.contentId}`,
        libraryId: lib.id,
        type: spot.type,
        name: spot.name,
        subCategory: spot.subCategoryHint,
        address: spot.address,
        coords: spot.coords,
        distanceMeters: spot.distanceMeters,
        imageUrl: photo.url,
        /** 출처 표기 의무가 있다. 앱의 [마이 > 사진 출처] 에 모아 보여준다. */
        credit: '한국관광공사',
        copyright: photo.copyright,
      });
    }

    if (places.length > 0) byLibrary[lib.id] = places;
    kept += places.length;
    console.log(` 사진 ${places.length}곳`);
  } catch (e) {
    console.log(` 실패 — ${e.message}`);
  }

  await sleep(150);
}

const out = {
  _readme:
    '한국관광공사 TourAPI 로 빌드 타임에 수집한 "사진 있는 주변 장소" 입니다. ' +
    '직접 고치지 마세요. 다시 모으려면 npm run collect-tour.',
  _generatedAt: new Date().toISOString(),
  _radiusMeters: RADIUS,
  _source: '한국관광공사 (공공누리 제1·3유형 사진만)',
  byLibrary,
};

const file = path.join(ROOT, 'src/data/tour-photos.generated.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');

console.log(`
끝.
  도서관 ${Object.keys(byLibrary).length}곳에 사진 ${kept}장
  저작권을 못 읽어 버린 장소 ${droppedByCopyright}곳
  API 호출 ${requests}회 (개발계정 하루 1,000회)
  → src/data/tour-photos.generated.json
`);
