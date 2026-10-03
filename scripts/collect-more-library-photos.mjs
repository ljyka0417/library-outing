/**
 * 도서관 실사진 더 모으기 — collect-library-photos(관광공사 이름 검색)가 못 찾은 도서관을 채운다.
 *
 *   npm run collect-more-library-photos
 *
 * 1) 관광공사 위치 검색 — 우리 좌표 300m 안에 "도서관"으로 등록된 문화시설(이름이 조금 달라 이름 검색에
 *    안 걸린 곳: 「안산시미디어도서관」↔「안산미디어도서관」). 공공누리 제1·3유형만.
 * 2) 위키미디어 공용(Wikimedia Commons) — 사람이 한 장씩 보고 그 도서관이 맞다고 확인한 파일만(COMMONS).
 *    자유 라이선스(CC BY·CC BY-SA·CC0·퍼블릭 도메인)만 받고, 지은이·라이선스를 함께 적는다.
 *    이름 검색으로 걸린 파일을 그대로 쓰면 「유림공원2.jpg」처럼 그 도서관이 아닌 사진이 섞인다.
 *
 * 결과: src/data/library-photos.extra.json  { byId: { id: { url, credit, license?, source } } }
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';

const require = createRequire(import.meta.url);
const load = require('./lib/load-app-ts.cjs');
const { MOCK_LIBRARIES } = load('src/data/libraries.mock.ts');
const have = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/library-photos.generated.json'), 'utf8')).byId ?? {});

/** 사람이 확인한 위키미디어 공용 파일 — 도서관 id → 파일 이름 */
const COMMONS = {
  'seoul-library': 'File:Seoul Metropolitan Library 20191221 01.jpg',
  'pangyo-kids': 'File:판교어린이도서관 (1).JPG',
  'songdo-kids': 'File:송도국제어린이도서관.png',
  'seonhak-starlight': 'File:선학별빛도서관.jpg',
  'jungcheon-philosophy': 'File:Jungcheon Philosophy Library.jpg',
  'dongdaejeon-library': 'File:Dongdaejeon Library (25031102).jpg',
  'gyeongju-city': 'File:Korea-Gyeongju-Gyeongju Municipal Library at Hwangseong Park-01.jpg',
  'halla-library': 'File:Halla Library.jpeg',
  'unnam-kids': 'File:운남어린이도서관 1.jpg',
};
// 공공누리 제1·3유형(출처 표시)도 자유롭게 쓸 수 있다
const FREE = /^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain|PD|KOGL Type [13])/i;
const UA = { 'User-Agent': 'Larchive-student-app/1.0 (graduation project)' };

const KEY = requireEnv('DATA_GO_KR_KEY', 'data.go.kr 인증키를 .env 에 넣어 주세요.');
const SERVICE_KEY = /%[0-9A-Fa-f]{2}/.test(KEY) ? KEY : encodeURIComponent(KEY);
const secure = (u) => String(u ?? '').replace(/^http:\/\//, 'https://');
const strip = (h) => String(h ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const byId = {};
const ids = new Set(MOCK_LIBRARIES.map((l) => l.id));

// ── 1) 관광공사 위치 검색
for (const lib of MOCK_LIBRARIES) {
  if (!lib.coords || have.includes(lib.id)) continue;
  const u = `https://apis.data.go.kr/B551011/KorService2/locationBasedList2?MobileOS=ETC&MobileApp=larchive&_type=json&serviceKey=${SERVICE_KEY}` +
    `&mapX=${lib.coords.lng}&mapY=${lib.coords.lat}&radius=300&contentTypeId=14&numOfRows=30&pageNo=1&arrange=E`;
  try {
    const j = await fetch(u).then((r) => r.json());
    let items = j?.response?.body?.items?.item ?? [];
    if (!Array.isArray(items)) items = [items];
    const hit = items.find((i) => /도서관/.test(i.title ?? '') && i.firstimage && ['Type1', 'Type3'].includes(i.cpyrhtDivCd));
    if (hit) {
      byId[lib.id] = { url: secure(hit.firstimage), credit: '한국관광공사', license: hit.cpyrhtDivCd === 'Type1' ? 'KOGL Type 1' : 'KOGL Type 3', source: `tour:${hit.title}` };
      console.log(`  관광공사  ${lib.name} ← ${hit.title} (${Math.round(hit.dist)}m)`);
    }
  } catch {
    // 못 받으면 넘어간다
  }
  await sleep(120);
}

// ── 2) 위키미디어 공용
for (const [id, title] of Object.entries(COMMONS)) {
  if (!ids.has(id)) {
    console.log(`  (모르는 도서관 id: ${id})`);
    continue;
  }
  if (have.includes(id) || byId[id]) continue;
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&titles=${encodeURIComponent(title)}`;
  try {
    const j = await fetch(u, { headers: UA }).then((r) => r.json());
    const page = Object.values(j?.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    const license = strip(meta.LicenseShortName?.value);
    const artist = strip(meta.Artist?.value) || 'Wikimedia Commons';
    if (!info?.thumburl || !FREE.test(license)) {
      console.log(`  공용 거절  ${id}: ${license || '라이선스 없음'}`);
      continue;
    }
    byId[id] = { url: info.thumburl, credit: `${artist} · ${license} · Wikimedia Commons`, license, source: info.descriptionurl };
    console.log(`  공용      ${id} ← ${title} (${license}, ${artist})`);
  } catch (e) {
    console.log(`  공용 실패  ${id}: ${e.message}`);
  }
  await sleep(200);
}

const OUT = path.join(ROOT, 'src/data/library-photos.extra.json');
fs.writeFileSync(OUT, JSON.stringify({
  _readme: '관광공사 이름 검색이 못 찾은 도서관 사진 — 관광공사 위치 검색과 위키미디어 공용(사람이 확인한 파일). npm run collect-more-library-photos 가 덮어씁니다.',
  _generatedAt: new Date().toISOString(),
  byId,
}, null, 2) + '\n');
console.log(`\n${Object.keys(byId).length}곳 더 → ${path.relative(ROOT, OUT)}`);
