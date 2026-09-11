/**
 * 도서관 자체 사진을 한국관광공사 TourAPI 에서 찾는다.
 *
 *   npm run collect-library-photos
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 이게 되는가
 * ─────────────────────────────────────────────────────────────
 * 우리 132곳 중 일부는 관광공사에 "문화시설" 로 등록되어 있다. 등록된 곳은
 * 공사가 저작권을 확보한 사진을 API 로 내려준다. 즉 **그 도서관의 진짜
 * 사진을 합법적으로** 쓸 수 있다.
 *
 * 구글 이미지를 가져와 포토샵으로 가공하는 것과는 다르다. 필터를 걸어도
 * 원본의 2차적저작물이라 원저작자 허락이 필요하고, 애초에 검색 결과가 그
 * 도서관이 아닌 경우도 많다.
 *
 * ─────────────────────────────────────────────────────────────
 * 엉뚱한 사진을 붙이지 않으려고
 * ─────────────────────────────────────────────────────────────
 * 이름만 비슷하면 다른 건물이 걸린다. 「중앙도서관」 같은 이름은 전국에 널려
 * 있다. 그래서 두 가지를 다 만족해야 받아들인다.
 *   1) 이름이 충분히 겹칠 것
 *   2) 우리가 아는 좌표에서 가까울 것 (MAX_DISTANCE 안)
 *
 * 좌표는 카카오로 확인한 값이라 믿을 만하다. 이름이 같아도 멀면 버린다 —
 * 사진이 없는 편이 남의 건물 사진을 그 도서관이라고 내보이는 것보다 낫다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';

const KEY = requireEnv('DATA_GO_KR_KEY', 'data.go.kr 인증키를 .env 에 넣어 주세요.');

// data.go.kr 은 Encoding 키(이미 인코딩됨)와 Decoding 키(원문)를 둘 다 준다.
// 인코딩된 키에 또 인코딩을 걸면 "등록되지 않은 서비스키" 가 된다.
const SERVICE_KEY = /%[0-9A-Fa-f]{2}/.test(KEY) ? KEY : encodeURIComponent(KEY);
const BASE = 'http://apis.data.go.kr/B551011/KorService2';
const COMMON = `MobileOS=ETC&MobileApp=librarymap&_type=json&serviceKey=${SERVICE_KEY}`;

/** 이 거리(m)를 넘으면 이름이 같아도 다른 곳으로 본다 */
const MAX_DISTANCE = 700;
/** 이름이 이만큼은 겹쳐야 한다 (0~1) */
const MIN_SIMILARITY = 0.55;
/** 쓸 수 있는 저작권 유형 — 제1유형(출처표시), 제3유형(출처표시+변경금지) */
const OK_COPYRIGHT = new Set(['Type1', 'Type3']);

/**
 * 사진 주소를 https 로 맞춘다.
 *
 * ⚠️ 관광공사는 같은 사진을 http 로 주기도 하고 https 로 주기도 한다.
 *   http 로 온 것을 그대로 두면 **아이폰에서 사진이 안 나온다.** 애플이
 *   기본으로 http 접속을 막기 때문이다(App Transport Security). 웹에서는
 *   멀쩡히 보이다가 기기에서만 빈칸이 돼서 원인을 찾기 어렵다.
 *   같은 주소가 https 로도 열리므로 여기서 바꿔 둔다.
 */
const secure = (url) => String(url ?? '').replace(/^http:\/\//, 'https://');

let requests = 0;

async function callApi(op, params) {
  const res = await fetch(`${BASE}/${op}?${COMMON}&${params}`);
  requests++;
  const text = await res.text();

  if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
    console.error('\n키가 관광 API 에 등록되어 있지 않습니다.\n');
    process.exit(1);
  }
  if (text.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS')) {
    console.error('\n오늘 호출 한도를 다 썼습니다. 내일 이어서 돌리세요.\n');
    process.exit(1);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${op}: 응답을 읽지 못했습니다 — ${text.slice(0, 120)}`);
  }
  if (json?.OpenAPI_ServiceResponse) {
    const e = json.OpenAPI_ServiceResponse.cmmMsgHeader ?? {};
    console.error(`\n관광 API 가 거절했습니다 — ${e.returnAuthMsg ?? ''}\n`);
    process.exit(1);
  }

  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

/* ── 얼마나 같은 이름인가 ─────────────────────────────────── */

/** 두 글자씩 잘라 겹치는 비율을 본다 (Dice) */
function similarity(a, b) {
  const norm = (s) => s.replace(/\s|[()[\]]/g, '');
  const x = norm(a);
  const y = norm(b);
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;

  const pairs = (s) => {
    const out = [];
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
  };
  const px = pairs(x);
  const py = pairs(y);
  let hit = 0;
  const pool = [...py];
  for (const p of px) {
    const i = pool.indexOf(p);
    if (i >= 0) {
      hit++;
      pool.splice(i, 1);
    }
  }
  return (2 * hit) / (px.length + py.length);
}

/** 두 좌표 사이 거리(m) */
function distance(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

/* ── 도서관 목록 ─────────────────────────────────────────── */

function readLibraries() {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/libraries.mock.ts'), 'utf8');
  const seeds = [
    ...src.matchAll(/\{ id: '([^']+)', name: '([^']+)', sido: '([^']+)'([^}]*)\}/g),
  ].map((m) => ({ id: m[1], name: m[2], sido: m[3] }));

  const geo = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src/data/libraries.geocoded.json'), 'utf8')
  ).entries;

  return seeds
    .map((s) => ({ ...s, coords: geo[s.id]?.coords }))
    .filter((s) => s.coords && Number.isFinite(s.coords.lat));
}

/* ── 실행 ────────────────────────────────────────────────── */

const libraries = readLibraries();
console.log(`도서관 사진 찾기 — ${libraries.length}곳 (좌표가 있는 곳만)\n`);

const byId = {};
let found = 0;
let rejectedFar = 0;
let rejectedCopyright = 0;
let noPhoto = 0;

for (let i = 0; i < libraries.length; i++) {
  const lib = libraries[i];
  process.stdout.write(`  [${i + 1}/${libraries.length}] ${lib.name.padEnd(20)}`);

  try {
    const hits = await callApi(
      'searchKeyword2',
      `numOfRows=10&pageNo=1&keyword=${encodeURIComponent(lib.name)}`
    );
    await sleep(120);

    // 이름이 닮았고 가까운 것 중 가장 가까운 하나
    const candidates = hits
      .filter((h) => h.mapx && h.mapy)
      .map((h) => ({
        raw: h,
        sim: similarity(lib.name, String(h.title ?? '')),
        dist: distance(lib.coords, { lat: Number(h.mapy), lng: Number(h.mapx) }),
      }))
      .filter((c) => c.sim >= MIN_SIMILARITY)
      .sort((a, b) => a.dist - b.dist);

    if (candidates.length === 0) {
      console.log(' 관광공사에 없음');
      continue;
    }

    const best = candidates[0];
    if (best.dist > MAX_DISTANCE) {
      // 이름은 닮았는데 멀다 — 같은 이름의 다른 도서관이다
      console.log(` 이름만 닮음 (${best.dist}m 떨어짐) — 버림`);
      rejectedFar++;
      continue;
    }
    if (!best.raw.firstimage) {
      console.log(' 등록됐지만 사진 없음');
      noPhoto++;
      continue;
    }

    // 저작권 확인
    const images = await callApi(
      'detailImage2',
      `contentId=${best.raw.contentid}&imageYN=Y&numOfRows=5&pageNo=1`
    );
    await sleep(120);

    const ok = images.find((im) => OK_COPYRIGHT.has(String(im.cpyrhtDivCd ?? '')));
    if (!ok) {
      console.log(' 사진은 있으나 저작권을 못 읽음 — 버림');
      rejectedCopyright++;
      continue;
    }

    byId[lib.id] = {
      url: secure(ok.originimgurl || ok.smallimageurl || best.raw.firstimage),
      credit: '한국관광공사',
      copyright: String(ok.cpyrhtDivCd),
      matchedTitle: String(best.raw.title),
      distanceMeters: best.dist,
    };
    found++;
    console.log(` 사진 있음 (${best.dist}m, ${ok.cpyrhtDivCd})`);
  } catch (e) {
    console.log(` 실패 — ${e.message}`);
  }

  await sleep(120);
}

const out = {
  _readme:
    '한국관광공사 TourAPI 에서 찾은 도서관 실사진입니다. 직접 고치지 마세요. ' +
    '다시 찾으려면 npm run collect-library-photos. ' +
    '이름이 닮고 좌표가 가까운 것만 받아들였고, 저작권 유형을 확인한 사진만 남겼습니다.',
  _generatedAt: new Date().toISOString(),
  _maxDistanceMeters: MAX_DISTANCE,
  _source: '한국관광공사 (공공누리 제1·3유형 사진만)',
  byId,
};

fs.writeFileSync(
  path.join(ROOT, 'src/data/library-photos.generated.json'),
  JSON.stringify(out, null, 2) + '\n'
);

console.log(`
끝.
  사진을 찾은 도서관 ${found}곳 / ${libraries.length}곳
  이름만 닮아서 버린 곳 ${rejectedFar}곳
  저작권을 못 읽어 버린 곳 ${rejectedCopyright}곳
  등록됐지만 사진이 없는 곳 ${noPhoto}곳
  API 호출 ${requests}회 (개발계정 하루 1,000회)
  → src/data/library-photos.generated.json
`);
