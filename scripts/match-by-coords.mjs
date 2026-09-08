/**
 * 좌표로 정보나루 도서관 코드를 찾는다.
 *
 *   npm run match-coords          제안만 보여준다 (파일을 고치지 않는다)
 *   npm run match-coords -- --write   확정해서 enriched.json 에 넣는다
 *
 * enrich 는 이름으로 매칭한다. 그런데 한국 도서관 이름은 같은 곳을 두고도
 * "화성 진안도서관" / "화성시립진안도서관" / "진안도서관" 처럼 제각각이라
 * 132곳 중 60곳이 끝내 안 붙었다.
 *
 * 좌표는 이름보다 정직하다. 카카오로 지오코딩해 둔 우리 좌표와
 * 정보나루가 주는 좌표를 맞대면 같은 건물인지 바로 알 수 있다.
 *
 * 다만 좌표만 믿지는 않는다. 한 건물에 여러 도서관이 등록된 경우가 있어서,
 * 가까운 후보들 중에서는 이름이 가장 비슷한 곳을 고른다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, readSeeds, sleep } from './lib/env.mjs';
import { similarity, strip } from './lib/match.mjs';

const KEY = requireEnv(
  'DATA4LIBRARY_KEY',
  `.env 에  DATA4LIBRARY_KEY=발급받은키  를 넣으세요.`
);

const WRITE = process.argv.includes('--write');

/** 이 거리 안이면 같은 건물로 본다 (m) */
const NEAR = 300;
/** 후보가 하나뿐일 때 이름이 달라도 받아들이는 거리 (m) */
const CERTAIN = 120;
/** 후보가 여럿일 때 요구하는 최소 이름 유사도 */
const MIN_SIMILARITY = 0.4;

/** 두 좌표 사이 거리 (m). 하버사인 */
function distance(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 정보나루 전체 도서관 목록을 받아 온다 (1,600곳 남짓) */
async function fetchAllLibraries() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const url =
      `https://data4library.kr/api/libSrch?authKey=${KEY}` +
      `&format=json&pageNo=${page}&pageSize=500`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const libs = (json?.response?.libs ?? []).map((l) => l.lib);
    all.push(...libs);
    process.stdout.write(`\r  받는 중 ${all.length} / ${json?.response?.numFound ?? '?'}`);
    if (all.length >= (json?.response?.numFound ?? 0) || libs.length === 0) break;
    await sleep(200);
  }
  process.stdout.write('\n');
  return all
    .filter((l) => l.latitude && l.longitude)
    .map((l) => ({
      libCode: l.libCode,
      // 정보나루 주소에는 &middot; 같은 HTML 엔티티가 섞여 온다
      name: String(l.libName ?? '').replace(/&[a-z]+;/g, '·'),
      address: String(l.address ?? '').replace(/&[a-z]+;/g, '·'),
      phone: l.tel || undefined,
      homepage: l.homepage || undefined,
      closedDays: l.closed || undefined,
      operatingTime: l.operatingTime || undefined,
      coords: { lat: Number(l.latitude), lng: Number(l.longitude) },
    }))
    .filter((l) => Number.isFinite(l.coords.lat) && Number.isFinite(l.coords.lng));
}

const seeds = readSeeds();
const enrichedFile = path.join(ROOT, 'src/data/libraries.enriched.json');
const enriched = JSON.parse(fs.readFileSync(enrichedFile, 'utf8'));
const geocoded = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/libraries.geocoded.json'), 'utf8')
).entries;

/** 이미 코드가 붙은 곳은 건드리지 않는다 */
const takenCodes = new Set(
  Object.values(enriched.entries ?? {})
    .map((e) => e.sourceApiId)
    .filter(Boolean)
);

const todo = seeds
  .map((s) => ({ ...s, coords: geocoded[s.id]?.coords ?? enriched.entries?.[s.id]?.coords }))
  .filter((s) => !enriched.entries?.[s.id]?.sourceApiId && s.coords);

console.log(`좌표로 도서관 코드 찾기`);
console.log(`  아직 코드가 없는 곳 ${todo.length}곳 (좌표가 있는 곳만)\n`);

const pool = await fetchAllLibraries();
console.log(`  정보나루 도서관 ${pool.length}곳과 대조\n`);

const found = [];
const skipped = [];

for (const s of todo) {
  const near = pool
    .filter((l) => !takenCodes.has(l.libCode))
    .map((l) => ({ ...l, dist: distance(s.coords, l.coords) }))
    .filter((l) => l.dist <= NEAR)
    .sort((a, b) => a.dist - b.dist);

  if (near.length === 0) {
    skipped.push({ seed: s, reason: `반경 ${NEAR}m 안에 없음` });
    continue;
  }

  const scored = near
    .map((l) => ({ ...l, sim: similarity(strip(l.name), strip(s.name)) }))
    .sort((a, b) => b.sim - a.sim || a.dist - b.dist);
  const best = scored[0];

  // 아주 가까운 데 후보가 하나뿐이면 이름이 달라도 같은 곳으로 본다.
  // (분관·별관은 정보나루 이름이 우리 이름과 전혀 다를 때가 있다)
  const onlyOneVeryClose = near.length === 1 && near[0].dist <= CERTAIN;

  // 이름이 어중간하게 닮았을 뿐인데 멀리 있으면 남남으로 본다.
  // "진도철마도서관" 과 270m 떨어진 "전라남도교육청진도도서관" 은 지역 이름만
  // 겹치는 다른 도서관이다. 이런 걸 붙이면 엉뚱한 대출 순위를 보여주게 된다.
  const weakNameFarAway = best.sim < 0.6 && best.dist > CERTAIN;

  if ((best.sim >= MIN_SIMILARITY && !weakNameFarAway) || onlyOneVeryClose) {
    takenCodes.add(best.libCode);
    found.push({ seed: s, lib: best });
  } else {
    skipped.push({
      seed: s,
      reason: `이름이 너무 다름 (가장 가까운 곳: ${near[0].name}, ${Math.round(near[0].dist)}m)`,
    });
  }
}

console.log('─'.repeat(64));
console.log(`찾음 ${found.length}곳 · 못 찾음 ${skipped.length}곳\n`);

for (const f of found) {
  const flag = f.lib.sim < 0.6 ? ' ⚠️' : '';
  console.log(
    `  ${f.seed.name}  →  ${f.lib.name} (${f.lib.libCode})` +
      `  ${Math.round(f.lib.dist)}m  유사도 ${f.lib.sim.toFixed(2)}${flag}`
  );
}

if (skipped.length > 0) {
  console.log(`\n못 찾은 곳:`);
  for (const s of skipped) console.log(`  ${s.seed.name} — ${s.reason}`);
}

console.log('─'.repeat(64));

if (!WRITE) {
  console.log('제안만 보여줬습니다. 확정하려면:  npm run match-coords -- --write');
  process.exit(0);
}

/* 확정: 이미 있는 값은 덮지 않는다. 사람이 확인해 넣은 값이 더 정확할 수 있다. */
for (const f of found) {
  const cur = enriched.entries[f.seed.id] ?? {};
  enriched.entries[f.seed.id] = {
    ...cur,
    sourceApiId: f.lib.libCode,
    matchedName: cur.matchedName ?? f.lib.name,
    matchedBy: 'coords',
    address: cur.address ?? f.lib.address,
    phone: cur.phone ?? f.lib.phone,
    homepage: cur.homepage ?? f.lib.homepage,
    closedDays: cur.closedDays ?? f.lib.closedDays,
    coords: cur.coords ?? f.lib.coords,
  };
}

enriched._generatedAt = new Date().toISOString();
fs.writeFileSync(enrichedFile, JSON.stringify(enriched, null, 2) + '\n', 'utf8');
console.log(`→ libraries.enriched.json 에 ${found.length}곳 반영`);
console.log('  이어서  npm run collect-books  를 돌리세요.');
