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
import { ROOT, requireEnv, readSeeds } from './lib/env.mjs';
import { strip, regionMatches, pickBest } from './lib/match.mjs';
import { parseHours, applyClosedDays } from './lib/hours.mjs';

const KEY = requireEnv(
  'DATA4LIBRARY_KEY',
  `1) https://www.data4library.kr 에서 인증키를 발급받으세요 (무료, 승인 필요)
2) .env 에  DATA4LIBRARY_KEY=발급받은키  한 줄 추가
   (.env.example 을 복사해서 쓰시면 됩니다)`
);

const seeds = readSeeds();
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

/**
 * 이름 매칭은 geocode 와 같은 규칙(scripts/lib/match.mjs)을 쓴다.
 * 처음엔 여기만 "이름 완전일치" 를 쓰다가 132곳 중 36곳밖에 못 잡았다.
 */

/* ── 운영시간 파싱 ──────────────────────────────────────────
   정보나루의 operatingTime 은 표준이 없는 자유 문자열이라 읽는 규칙이 제법 길다.
   geocode 쪽에서도 쓸 수 있게 scripts/lib/hours.mjs 로 옮겼다.
   못 읽는 문장은 byDay 를 비워 두고, 화면은 배지 없이 원문만 보여준다. */

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

/**
 * 자동 매칭을 아예 막을 도서관.
 *
 * 이름이 통째로 겹치는데 실제로는 다른 기관인 경우다. 규칙으로는 못 거르니
 * 확인된 것만 명시적으로 빼고, 카카오 수집분 + 수동 입력으로 채운다.
 */
const KNOWN_MISMATCHES = {
  // 대법원 산하 법원도서관(고양시 일산동구)인데 정보나루에는
  // 파주 법원읍의 '파주시립법원도서관' 만 있어 그쪽에 붙는다.
  'court-library': '파주시립법원도서관과 혼동됨',
};

/** 우리 132곳의 이름 집합 — 다른 도서관이 끼어드는 걸 막는 데 쓴다 */
const seedNames = new Set(seeds.map((s) => strip(s.name)));

/** 후보 목록을 매처가 이해하는 모양으로 */
const candidates = apiLibs
  .filter((lib) => lib.libName)
  .map((lib) => ({ name: lib.libName, address: lib.address ?? '', raw: lib }));

const entries = {};
const unmatched = [];
const lowConfidence = [];
const review = [];

for (const seed of seeds) {
  if (KNOWN_MISMATCHES[seed.id]) {
    unmatched.push(seed);
    continue;
  }

  // 지역이 맞는 후보로 먼저 좁힌다 (전국 1600곳을 매번 다 볼 필요 없다)
  const pool = candidates.filter((c) => regionMatches(c.address, seed.sido));
  const { picked, best } = pickBest(pool.length > 0 ? pool : candidates, seed, seedNames);

  if (!picked) {
    if (best && best.similarity >= 0.45) {
      lowConfidence.push({ seed, guess: best.cand.name, addr: best.cand.address, s: best.score });
    } else {
      unmatched.push(seed);
    }
    continue;
  }

  // 이름이 완전히 같지 않은 매칭은 나중에 사람이 훑어볼 수 있게 남긴다
  if (picked.similarity < 0.9) {
    review.push({ seed, matched: picked.cand.name, sim: picked.similarity });
  }

  const lib = picked.cand.raw;
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

const needManual = [...unmatched, ...lowConfidence.map((l) => l.seed)];
if (needManual.length > 0) {
  const csv = [
    'id,name,sido,sigungu,address,phone,homepage,operatingTime,closedDays',
    ...needManual.map((s) => `${s.id},${s.name},${s.sido},${s.sigungu ?? ''},,,,,`),
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'libraries.unmatched.csv'), '﻿' + csv, 'utf8');
}

/* ── 결과 보고 ──────────────────────────────────────────────── */
const matched = Object.keys(entries).length;
const withCoords = Object.values(entries).filter((e) => e.coords).length;
const withHours = Object.values(entries).filter((e) => e.hours?.byDay?.length).length;
const withClosed = Object.values(entries).filter((e) => e.closedDays).length;

console.log('─'.repeat(52));
console.log(`매칭 성공   ${matched} / ${seeds.length}곳`);
console.log(`  주소·좌표 ${withCoords}곳`);
console.log(`  운영시간  ${withHours}곳 (요일별 판정까지 가능한 것만)`);
console.log(`  휴관일    ${withClosed}곳`);
console.log(`확신 부족   ${lowConfidence.length}곳 — 비워 뒀습니다`);
console.log(`매칭 실패   ${unmatched.length}곳`);

if (lowConfidence.length > 0) {
  console.log('\n확신이 부족해 건너뛴 곳:');
  for (const l of lowConfidence.slice(0, 12)) {
    console.log(`  ${l.seed.name} (${l.seed.sido})  ← 후보: ${l.guess} [${l.s}점]`);
  }
  if (lowConfidence.length > 12) console.log(`  ... 외 ${lowConfidence.length - 12}곳`);
}
if (unmatched.length > 0) {
  console.log('\n정보나루에 없는 곳 (작은도서관·사립·전문도서관):');
  for (const s of unmatched.slice(0, 12)) console.log(`  ${s.name} (${s.sido})`);
  if (unmatched.length > 12) console.log(`  ... 외 ${unmatched.length - 12}곳`);
}
if (review.length > 0) {
  console.log('\n이름이 정확히 같지는 않은 매칭 (한 번 훑어보세요):');
  for (const r of review.sort((a, b) => a.sim - b.sim)) {
    console.log(`  ${r.seed.name} (${r.seed.sido})  →  ${r.matched}  [${r.sim.toFixed(2)}]`);
  }
}
if (needManual.length > 0) {
  console.log(`\n손으로 채울 목록 → libraries.unmatched.csv (${needManual.length}곳)`);
}
console.log('─'.repeat(52));
console.log('→ src/data/libraries.enriched.json 갱신 완료');
