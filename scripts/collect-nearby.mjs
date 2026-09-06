/**
 * 도서관 주변 맛집·카페·문화시설을 빌드 타임에 수집해 앱에 넣는다.
 *
 *   npm run collect-nearby
 *
 * 왜 런타임이 아니라 빌드 타임인가
 *   앱에서 카카오 API 를 직접 부르려면 REST 키를 앱 번들에 넣어야 하는데,
 *   그러면 앱을 뜯어 키를 꺼낼 수 있다. 반면 주변 맛집·카페는 실시간으로
 *   바뀌는 정보가 아니라서, 한 번 수집해 JSON 으로 넣어 두면
 *     - 키가 앱에 들어가지 않고
 *     - API 호출이 132곳 × 3종 = 396회로 끝나며
 *     - 오프라인에서도 보이고
 *     - 로딩이 없다.
 *   가게가 바뀌면 다시 돌려서 앱을 업데이트하면 된다.
 *
 * 좌표가 있는 도서관만 대상이다. 먼저 `npm run geocode` 를 돌려야 한다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, readSeeds, sleep, progress } from './lib/env.mjs';

const KEY = requireEnv(
  'KAKAO_REST_KEY',
  `.env 에  KAKAO_REST_KEY=발급받은키  를 넣으세요.
카카오 개발자 사이트에서 [카카오맵] 서비스 활성화도 필요합니다.`
);

/** 반경(m). 도보로 갈 만한 거리로 잡는다. */
const RADIUS = 1200;
/** 종류별로 몇 곳까지 담을지 */
const PER_TYPE = 6;

const TYPES = [
  { type: 'restaurant', code: 'FD6', label: '맛집' },
  { type: 'cafe', code: 'CE7', label: '카페' },
  { type: 'culture', code: 'CT1', label: '문화시설' },
];

/* ── 좌표 모으기 (geocoded < enriched < manual) ─────────────── */
function loadEntries(file) {
  const p = path.join(ROOT, 'src/data', file);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8')).entries ?? {};
}

const merged = {};
for (const file of ['libraries.geocoded.json', 'libraries.enriched.json', 'libraries.manual.json']) {
  for (const [id, v] of Object.entries(loadEntries(file))) {
    merged[id] = { ...merged[id], ...v };
  }
}

const seeds = readSeeds();
const targets = seeds
  .map((s) => ({ ...s, coords: merged[s.id]?.coords }))
  .filter((s) => s.coords);

if (targets.length === 0) {
  console.error(`
좌표가 있는 도서관이 없습니다.

  먼저 좌표를 채우세요:  npm run geocode
`);
  process.exit(1);
}

console.log(`좌표 있는 도서관 ${targets.length} / ${seeds.length}곳`);
console.log(`반경 ${RADIUS}m, 종류별 최대 ${PER_TYPE}곳 → 요청 약 ${targets.length * 3}회\n`);

async function searchCategory(code, coords) {
  const params = new URLSearchParams({
    category_group_code: code,
    x: String(coords.lng), // 카카오는 x=경도, y=위도
    y: String(coords.lat),
    radius: String(RADIUS),
    sort: 'distance',
    size: String(PER_TYPE),
  });

  const res = await fetch(`https://dapi.kakao.com/v2/local/search/category.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KEY}` },
  });

  if (res.status === 401 || res.status === 403) {
    console.error(`\n\n인증 실패 (${res.status}).`);
    console.error(await res.text());
    console.error('\n카카오 개발자 사이트에서 [카카오맵] 서비스가 활성화됐는지 확인하세요.');
    process.exit(1);
  }
  if (res.status === 429) {
    await sleep(2000);
    return searchCategory(code, coords);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return (await res.json()).documents ?? [];
}

const places = [];
let requests = 0;

for (let i = 0; i < targets.length; i++) {
  const lib = targets[i];
  progress(i, targets.length, lib.name);

  for (const { type, code } of TYPES) {
    try {
      const docs = await searchCategory(code, lib.coords);
      requests++;

      docs.forEach((d, idx) => {
        places.push({
          id: `${lib.id}-${type}-${idx}`,
          libraryId: lib.id,
          type,
          name: d.place_name,
          // "음식점 > 한식 > 국밥" 에서 마지막 조각만
          subCategory: (d.category_name ?? '').split('>').pop()?.trim() ?? '',
          address: d.road_address_name || d.address_name || '',
          coords: { lat: Number(d.y), lng: Number(d.x) },
          distanceMeters: Number(d.distance) || 0,
          placeUrl: d.place_url || undefined,
        });
      });
    } catch {
      // 한 종류가 실패해도 나머지는 계속 진행한다
    }
    await sleep(110);
  }
}

process.stdout.write('\n\n');

/* ── 저장 ─────────────────────────────────────────────────── */
const byLibrary = {};
for (const p of places) {
  (byLibrary[p.libraryId] ??= []).push(p);
}

fs.writeFileSync(
  path.join(ROOT, 'src/data/nearby.generated.json'),
  JSON.stringify(
    {
      _readme: [
        '카카오 로컬 API 로 빌드 타임에 수집한 주변 장소입니다. 직접 고치지 마세요.',
        '생성: npm run collect-nearby',
        `수집 조건: 반경 ${RADIUS}m, 종류별 최대 ${PER_TYPE}곳, 거리순`,
        '가게는 바뀝니다. 앱 업데이트 전에 다시 돌리세요.',
      ],
      _generatedAt: new Date().toISOString(),
      _radiusMeters: RADIUS,
      byLibrary,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

/* ── 보고 ─────────────────────────────────────────────────── */
const counts = TYPES.map((t) => ({
  label: t.label,
  n: places.filter((p) => p.type === t.type).length,
}));
const emptyLibs = targets.filter((t) => !byLibrary[t.id]?.length);

console.log('─'.repeat(52));
console.log(`API 호출 ${requests}회 → 장소 ${places.length}곳 수집`);
for (const c of counts) console.log(`  ${c.label.padEnd(6)} ${c.n}곳`);
console.log(`\n주변 정보가 있는 도서관 ${Object.keys(byLibrary).length} / ${targets.length}곳`);
if (emptyLibs.length > 0) {
  console.log(`주변에 아무것도 없던 곳 ${emptyLibs.length}곳 (외곽 지역일 수 있습니다):`);
  for (const l of emptyLibs.slice(0, 10)) console.log(`  ${l.name} (${l.sido})`);
}
console.log('─'.repeat(52));
console.log('→ src/data/nearby.generated.json 갱신 완료');
