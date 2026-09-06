/**
 * 도서관 정보나루 API 로 132곳의 상세 정보를 채운다.
 *
 *   npm run enrich
 *
 * 하는 일
 *   1) 정보나루에서 전국 도서관 목록을 전부 받아온다 (libSrch)
 *   2) 우리 132곳과 이름·지역으로 매칭한다
 *   3) 주소·전화·홈페이지·좌표·휴관일·운영시간을 뽑아
 *      src/data/libraries.enriched.json 에 쓴다
 *   4) 못 찾은 곳은 libraries.unmatched.csv 로 뽑아 준다 (손으로 채울 목록)
 *
 * 인증키 발급
 *   https://www.data4library.kr 회원가입 → 마이페이지 → 인증키 신청 (무료, 승인 필요)
 *   받은 키를 .env 의 EXPO_PUBLIC_DATA4LIBRARY_KEY 에 넣는다.
 *
 * ⚠️ 정보나루는 공공도서관 위주다. 작은도서관·사립·전문도서관
 *   (농심식문화전문도서관, 브라이튼도서관, 법원도서관 등)은 없을 수 있다.
 *   그런 곳은 unmatched 로 빠지니 libraries.manual.json 에 손으로 넣으면 된다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── 인증키 읽기 (.env) ─────────────────────────────────────── */
function readEnvKey() {
  if (process.env.EXPO_PUBLIC_DATA4LIBRARY_KEY) return process.env.EXPO_PUBLIC_DATA4LIBRARY_KEY;
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return '';
  const m = fs.readFileSync(envPath, 'utf8').match(/^EXPO_PUBLIC_DATA4LIBRARY_KEY=(.*)$/m);
  return m ? m[1].trim() : '';
}

const KEY = readEnvKey();
if (!KEY) {
  console.error(`
인증키가 없습니다.

  1) https://www.data4library.kr 에서 인증키를 발급받으세요 (무료, 승인 필요)
  2) .env 파일을 만들고 아래 한 줄을 넣으세요

     EXPO_PUBLIC_DATA4LIBRARY_KEY=발급받은키

  (.env.example 을 복사해서 쓰시면 됩니다)
`);
  process.exit(1);
}

/* ── 우리 132곳 읽기 ───────────────────────────────────────── */
const src = fs.readFileSync(path.join(ROOT, 'src/data/libraries.mock.ts'), 'utf8');
const seeds = [
  ...src.matchAll(
    /\{ id: '([^']+)', name: '([^']+)', sido: '([^']+)'(?:, sigungu: '([^']+)')?/g
  ),
].map((m) => ({ id: m[1], name: m[2], sido: m[3], sigungu: m[4] }));

if (seeds.length === 0) {
  console.error('도서관 목록을 읽지 못했습니다. src/data/libraries.mock.ts 를 확인하세요.');
  process.exit(1);
}
console.log(`대상 ${seeds.length}곳\n`);

/* ── 정보나루에서 전국 목록 받기 ───────────────────────────── */
async function fetchAllLibraries() {
  const all = [];
  const PAGE_SIZE = 1000;

  for (let page = 1; page <= 20; page++) {
    const url =
      `https://data4library.kr/api/libSrch?authKey=${KEY}` +
      `&pageNo=${page}&pageSize=${PAGE_SIZE}&format=json`;

    process.stdout.write(`  ${page}페이지 요청... `);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // 인증 실패 시 XML 에러가 오는 경우가 있다
      throw new Error(`응답을 해석할 수 없습니다. 인증키를 확인하세요.\n${text.slice(0, 300)}`);
    }

    const libs = json?.response?.libs ?? [];
    console.log(`${libs.length}건`);
    if (libs.length === 0) break;

    all.push(...libs.map((row) => row.lib));
    if (libs.length < PAGE_SIZE) break;
  }
  return all;
}

/* ── 이름 정규화 ────────────────────────────────────────────
   "서울특별시립 강남도서관" 과 "강남도서관" 이 같은 곳으로 잡히도록
   공백·괄호·행정 접두어를 걷어낸다. */
function normalize(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/[\s·\-_]/g, '')
    .replace(/(특별자치|광역)?시립|도립|군립|구립|공립|시|도|군|구청/g, '')
    .toLowerCase();
}

/** 시도 표기를 우리 분류로 되돌린다 (정보나루는 "서울특별시" 식) */
const SIDO_ALIAS = {
  서울: '서울', 경기: '경기', 인천: '인천', 강원: '강원',
  충북: '충청', 충남: '충청', 대전: '대전', 세종: '세종',
  전북: '전라', 전남: '전라', 광주: '광주',
  경북: '경상', 경남: '경상', 대구: '대구', 울산: '울산', 부산: '부산',
  제주: '제주',
};

function sidoOf(address = '') {
  for (const key of Object.keys(SIDO_ALIAS)) {
    if (address.startsWith(key)) return SIDO_ALIAS[key];
  }
  // "서울특별시" / "전라북도" 처럼 긴 표기 대응
  const long = {
    서울특별시: '서울', 경기도: '경기', 인천광역시: '인천', 강원특별자치도: '강원', 강원도: '강원',
    충청북도: '충청', 충청남도: '충청', 대전광역시: '대전', 세종특별자치시: '세종',
    전북특별자치도: '전라', 전라북도: '전라', 전라남도: '전라', 광주광역시: '광주',
    경상북도: '경상', 경상남도: '경상', 대구광역시: '대구', 울산광역시: '울산',
    부산광역시: '부산', 제주특별자치도: '제주',
  };
  for (const [k, v] of Object.entries(long)) if (address.startsWith(k)) return v;
  return '';
}

/* ── 운영시간 파싱 ──────────────────────────────────────────
   정보나루의 operatingTime 은 자유 문자열이다. 흔한 패턴만 처리하고,
   못 읽으면 label 만 남기고 byDay 는 비운다. 틀린 시간을 단정해 보여주느니
   "운영중" 뱃지를 숨기는 편이 낫다. */
function parseHours(raw) {
  if (!raw) return undefined;
  const label = raw.replace(/\s+/g, ' ').trim();

  const m = label.match(/(\d{1,2})\s*:\s*(\d{2})\s*[~\-–]\s*(\d{1,2})\s*:\s*(\d{2})/);
  if (!m) return { label, byDay: [] };

  const open = Number(m[1]) * 60 + Number(m[2]);
  const close = Number(m[3]) * 60 + Number(m[4]);
  if (close <= open) return { label, byDay: [] };

  return { label, byDay: Array.from({ length: 7 }, () => ({ open, close })) };
}

/** 휴관일 문구에서 쉬는 요일을 뽑아 byDay 에 반영 */
const DAY_TOKENS = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
function applyClosedDays(hours, closedText) {
  if (!hours?.byDay?.length || !closedText) return hours;
  for (const [ch, idx] of Object.entries(DAY_TOKENS)) {
    if (new RegExp(`매주\\s*${ch}`).test(closedText)) hours.byDay[idx] = null;
  }
  return hours;
}

/* ── 실행 ───────────────────────────────────────────────────── */
console.log('정보나루에서 전국 도서관 목록을 받아옵니다...');
let apiLibs;
try {
  apiLibs = await fetchAllLibraries();
} catch (e) {
  console.error(`\n조회 실패: ${e.message}`);
  process.exit(1);
}
console.log(`\n총 ${apiLibs.length}곳 수신\n`);

// 정규화 이름 → 후보 목록
const index = new Map();
for (const lib of apiLibs) {
  const key = normalize(lib.libName ?? '');
  if (!key) continue;
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(lib);
}

const entries = {};
const unmatched = [];
const ambiguous = [];

for (const seed of seeds) {
  const key = normalize(seed.name);
  let candidates = index.get(key) ?? [];

  // 지역이 다르면 후보에서 뺀다 (같은 이름의 도서관이 여러 지역에 있다)
  if (candidates.length > 1) {
    const sameRegion = candidates.filter((c) => sidoOf(c.address ?? '') === seed.sido);
    if (sameRegion.length > 0) candidates = sameRegion;
  }

  if (candidates.length === 0) {
    unmatched.push(seed);
    continue;
  }
  if (candidates.length > 1) ambiguous.push({ seed, count: candidates.length });

  const lib = candidates[0];
  const lat = Number(lib.latitude);
  const lng = Number(lib.longitude);

  const hours = applyClosedDays(parseHours(lib.operatingTime), lib.closed);

  entries[seed.id] = {
    sourceApiId: String(lib.libCode ?? ''),
    matchedName: lib.libName,
    address: lib.address || undefined,
    phone: lib.tel || undefined,
    homepage: lib.homepage || undefined,
    coords: Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : undefined,
    closedDays: lib.closed || undefined,
    hours: hours && (hours.byDay.length > 0 || hours.label) ? hours : undefined,
  };

  // undefined 필드는 JSON 에 남기지 않는다
  for (const k of Object.keys(entries[seed.id])) {
    if (entries[seed.id][k] === undefined) delete entries[seed.id][k];
  }
}

/* ── 저장 ───────────────────────────────────────────────────── */
const outPath = path.join(ROOT, 'src/data/libraries.enriched.json');
const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
fs.writeFileSync(
  outPath,
  JSON.stringify(
    { _readme: existing._readme, _generatedAt: new Date().toISOString(), entries },
    null,
    2
  ) + '\n',
  'utf8'
);

if (unmatched.length > 0) {
  const csv = [
    'id,name,sido,sigungu,address,phone,homepage,operatingTime,closedDays',
    ...unmatched.map((s) => `${s.id},${s.name},${s.sido},${s.sigungu ?? ''},,,,,`),
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'libraries.unmatched.csv'), '﻿' + csv, 'utf8');
}

/* ── 결과 보고 ──────────────────────────────────────────────── */
const matched = Object.keys(entries).length;
const withCoords = Object.values(entries).filter((e) => e.coords).length;
const withHours = Object.values(entries).filter((e) => e.hours?.byDay?.length).length;

console.log('─'.repeat(46));
console.log(`매칭 성공   ${matched} / ${seeds.length}곳`);
console.log(`  좌표      ${withCoords}곳`);
console.log(`  운영시간  ${withHours}곳 (파싱 성공한 것만)`);
console.log(`매칭 실패   ${unmatched.length}곳`);
if (ambiguous.length > 0) {
  console.log(`\n⚠️ 후보가 여럿이라 첫 번째를 쓴 곳 ${ambiguous.length}건 — 확인 필요:`);
  for (const a of ambiguous.slice(0, 10)) {
    console.log(`   ${a.seed.name} (${a.seed.sido}) — 후보 ${a.count}개`);
  }
}
if (unmatched.length > 0) {
  console.log(`\n손으로 채울 목록 → libraries.unmatched.csv`);
  console.log('   (정보나루에 없는 작은도서관·사립·전문도서관들입니다)');
  for (const s of unmatched.slice(0, 15)) console.log(`   - ${s.name} (${s.sido})`);
  if (unmatched.length > 15) console.log(`   ... 외 ${unmatched.length - 15}곳`);
}
console.log('─'.repeat(46));
console.log('→ src/data/libraries.enriched.json 갱신 완료');
