/**
 * 도서관 근처 주차장 — 전국주차장정보표준데이터(공공데이터포털)에서 미리 모아 앱에 담는다.
 *
 *   npm run collect-parking
 *
 * 주차장은 자주 바뀌지 않아서 빌드 때 한 번 모으면 된다(앱 사용 중에는 묻지 않는다).
 * 전국 목록을 1,000곳씩 받아 도서관마다 걸어서 갈 만한 거리(RADIUS) 안의 주차장을 가까운 순으로 담는다.
 * 요금·운영시간은 원문(지자체가 올린 값) 그대로다. 비어 있는 칸은 비워 둔다 — 지어내지 않는다.
 * 키는 .env 의 DATA_GO_KR_KEY (「전국주차장정보표준데이터」 활용신청 필요).
 *
 * 결과: src/data/parking.generated.json  { byLibrary: { id: [ { name, se, type, spaces, fee, … } ] } }
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';

const require = createRequire(import.meta.url);
const load = require('./lib/load-app-ts.cjs');
const { MOCK_LIBRARIES } = load('src/data/libraries.mock.ts');

const KEY = requireEnv('DATA_GO_KR_KEY', 'data.go.kr 인증키를 .env 에 넣어 주세요.');
const SERVICE_KEY = /%[0-9A-Fa-f]{2}/.test(KEY) ? KEY : encodeURIComponent(KEY);
const RADIUS = 800; // m, 걸어서 10분 남짓
const PER_LIBRARY = 3;

const dist = (a, b) => {
  const R = 6371000, r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.round(Math.hypot(x, y) * R);
};
const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
const hhmm = (v) => (/^\d{2}:\d{2}$/.test(str(v)) ? str(v) : '');

async function page(no) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.data.go.kr/openapi/tn_pubr_prkplce_info_api?serviceKey=${SERVICE_KEY}&pageNo=${no}&numOfRows=1000&type=json`);
      const body = JSON.parse(await res.text());
      if (body?.response?.header?.resultCode === '03' || body?.header?.resultCode === '03') return { items: [], total: 0 }; // 데이터 없음
      const b = body?.response?.body ?? body?.body;
      const items = b?.items?.item ?? b?.items ?? [];
      return { items: Array.isArray(items) ? items : [items], total: Number(b?.totalCount ?? 0) };
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`${no}쪽을 받지 못했습니다`);
}

const lots = [];
const first = await page(1);
lots.push(...first.items);
const pages = Math.ceil(first.total / 1000);
console.log(`전국 주차장 ${first.total}곳, ${pages}쪽`);
for (let no = 2; no <= pages; no++) {
  const { items } = await page(no);
  lots.push(...items);
  process.stdout.write(`\r  ${no}/${pages}쪽`);
  await sleep(200);
}
console.log('');

const usable = lots
  .map((p) => ({ p, lat: Number(p.latitude), lng: Number(p.longitude) }))
  .filter(({ lat, lng }) => lat > 32 && lat < 39.5 && lng > 124 && lng < 132);

const byLibrary = {};
let covered = 0;
for (const lib of MOCK_LIBRARIES) {
  if (!lib.coords) continue;
  const near = usable
    .map((u) => ({ ...u, d: dist(lib.coords, u) }))
    .filter((u) => u.d <= RADIUS)
    .sort((a, b) => a.d - b.d)
    // 같은 이름(같은 주차장이 두 번 올라온 것)은 하나만
    .filter((u, i, all) => all.findIndex((x) => str(x.p.prkplceNm) === str(u.p.prkplceNm)) === i)
    .slice(0, PER_LIBRARY);
  if (!near.length) continue;
  covered++;
  byLibrary[lib.id] = near.map(({ p, lat, lng, d }) => {
    const row = {
      name: str(p.prkplceNm),
      se: str(p.prkplceSe), // 공영·민영
      type: str(p.prkplceType), // 노상·노외·부설
      spaces: Number(p.prkcmprt) || undefined,
      fee: str(p.parkingchrgeInfo), // 무료·유료·혼합
      basicTime: Number(p.basicTime) || undefined,
      basicCharge: p.basicCharge !== '' && p.basicCharge !== undefined ? Number(p.basicCharge) : undefined,
      addTime: Number(p.addUnitTime) || undefined,
      addCharge: p.addUnitCharge !== '' && p.addUnitCharge !== undefined ? Number(p.addUnitCharge) : undefined,
      weekday: hhmm(p.weekdayOperOpenHhmm) && hhmm(p.weekdayOperColseHhmm) ? `${hhmm(p.weekdayOperOpenHhmm)}-${hhmm(p.weekdayOperColseHhmm)}` : '',
      phone: str(p.phoneNumber),
      address: str(p.rdnmadr) || str(p.lnmadr),
      coords: { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 },
      distance: d,
    };
    for (const k of Object.keys(row)) if (row[k] === '' || row[k] === undefined || Number.isNaN(row[k])) delete row[k];
    return row;
  });
}

const OUT = path.join(ROOT, 'src/data/parking.generated.json');
fs.writeFileSync(OUT, JSON.stringify({
  _readme: `도서관 근처(${RADIUS}m) 주차장 — 전국주차장정보표준데이터. 직접 고치지 마세요. npm run collect-parking 이 덮어씁니다.`,
  _generatedAt: new Date().toISOString(),
  byLibrary,
}, null, 0) + '\n');
console.log(`주차장 ${usable.length}곳 중 → 도서관 ${covered}/${MOCK_LIBRARIES.length}곳에 붙임 → ${path.relative(ROOT, OUT)}`);
