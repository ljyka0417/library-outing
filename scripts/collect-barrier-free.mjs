/**
 * 도서관 무장애 편의 정보 — 한국관광공사 무장애 여행 정보(KorWithService2).
 *
 *   npm run collect-barrier-free
 *
 * 휠체어 대여·엘리베이터·장애인 화장실·주차, 점자·오디오(시각), 수어·자막(청각),
 * 유모차·수유실(아이 동반)을 도서관별로 받아 둔다. 자주 바뀌지 않아 빌드 때 한 번 모으면 된다.
 *
 * 짝짓기: 도서관 이름으로 검색(searchKeyword2)해서, 그 결과 중 우리 좌표에서 1.5km 안에 있는
 * 곳만 같은 도서관으로 본다(이름이 같은 다른 동네 도서관을 피하려고). 못 찾은 도서관은 비워 둔다.
 * 키는 .env 의 DATA_GO_KR_KEY (포털에서 「한국관광공사_무장애 여행 정보」 활용신청 필요).
 * 하루 한도: 기능마다 1,000건 — 한 번 돌리면 검색 127건 + 상세 20여 건.
 *
 * 결과: src/data/barrier-free.generated.json  { byLibrary: { id: { contentId, title, info: {...} } } }
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
const BASE = 'https://apis.data.go.kr/B551011/KorWithService2';
const COMMON = `MobileOS=ETC&MobileApp=larchive&_type=json&serviceKey=${SERVICE_KEY}`;

/** 화면에 쓰는 항목만 남긴다 (API 가 주는 이름 그대로) */
const FIELDS = [
  'wheelchair', 'elevator', 'restroom', 'parking', 'exit', 'route', 'publictransport', 'handicapetc',
  'braileblock', 'helpdog', 'guidehuman', 'audioguide', 'bigprint', 'brailepromotion', 'guidesystem', 'blindhandicapetc',
  'signguide', 'videoguide', 'hearingroom', 'hearinghandicapetc',
  'stroller', 'lactationroom', 'babysparechair', 'infantsfamilyetc',
];

const dist = (a, b) => {
  const R = 6371000, r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.round(Math.hypot(x, y) * R);
};

async function call(op, params) {
  const res = await fetch(`${BASE}/${op}?${COMMON}&${params}`);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error(`${op}: ${text.slice(0, 120)}`); }
  const err = body?.response?.header?.resultCode;
  if (err && err !== '0000') throw new Error(`${op}: ${body.response.header.resultMsg}`);
  return [].concat(body?.response?.body?.items?.item ?? []);
}

/** "부산광역시 영도도서관" ⇄ "영도도서관": 공백 빼고 한쪽이 다른 쪽을 품으면 같은 이름 */
const tight = (s) => s.replace(/\s/g, '');
const sameName = (a, b) => tight(a).includes(tight(b)) || tight(b).includes(tight(a));

const byLibrary = {};
const missed = [];
for (const lib of MOCK_LIBRARIES) {
  if (!lib.coords) { missed.push(`${lib.name}(좌표 없음)`); continue; }
  try {
    const found = await call('searchKeyword2', `keyword=${encodeURIComponent(tight(lib.name))}&numOfRows=10&pageNo=1`);
    const match = found
      .filter((i) => i.mapx && i.mapy && sameName(i.title, lib.name))
      .map((i) => ({ i, d: dist(lib.coords, { lat: Number(i.mapy), lng: Number(i.mapx) }) }))
      .filter(({ d }) => d < 1500)
      .sort((a, b) => a.d - b.d)[0];
    if (!match) { missed.push(lib.name); await sleep(60); continue; }

    const [detail] = await call('detailWithTour2', `contentId=${match.i.contentid}`);
    const info = {};
    for (const f of FIELDS) {
      const v = String(detail?.[f] ?? '').replace(/\s+/g, ' ').trim();
      if (v) info[f] = v;
    }
    if (Object.keys(info).length) {
      byLibrary[lib.id] = { contentId: String(match.i.contentid), title: match.i.title, info };
      console.log(`  ✓ ${lib.name} ← ${match.i.title} (${match.d}m) · ${Object.keys(info).length}항목`);
    } else missed.push(`${lib.name}(정보 비어 있음)`);
  } catch (e) {
    console.error(`  ! ${lib.name}: ${e.message}`);
    if (/LIMITED|한도|SERVICE_KEY/.test(e.message)) break;
  }
  await sleep(60);
}

const OUT = path.join(ROOT, 'src/data/barrier-free.generated.json');
fs.writeFileSync(OUT, JSON.stringify({
  _readme: '한국관광공사 무장애 여행 정보. 직접 고치지 마세요 — npm run collect-barrier-free 가 덮어씁니다.',
  _source: '한국관광공사 무장애 여행 정보 (KorWithService2)',
  _generatedAt: new Date().toISOString(),
  byLibrary,
}, null, 2) + '\n');
console.log(`\n무장애 정보 ${Object.keys(byLibrary).length}/${MOCK_LIBRARIES.length}곳 → ${path.relative(ROOT, OUT)}`);
