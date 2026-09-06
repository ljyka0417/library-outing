/**
 * 도서관 데이터 정합성 점검
 *   node scripts/check-data.mjs
 *
 * TS 를 그대로 실행할 수 없으므로 소스를 정규식으로 훑는다.
 * 목적은 "빠진 것/겹친 것"을 빨리 잡는 것이지 완벽한 파싱이 아니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'src/data/libraries.mock.ts'), 'utf8');
const catSrc = fs.readFileSync(path.join(ROOT, 'src/data/categories.ts'), 'utf8');

const declaredCategories = [...catSrc.matchAll(/\{ id: '([a-z]+)',/g)].map((m) => m[1]);
const declaredSido = [...catSrc.matchAll(/^ {2}'([^']+)',$/gm)].map((m) => m[1]);

const entries = [
  ...src.matchAll(
    /\{ id: '([^']+)', name: '([^']+)', sido: '([^']+)'(?:, sigungu: '([^']+)')?, specialty: '([^']+)', categories: \[([^\]]*)\](, landmark: true)? \}/g
  ),
].map((m) => ({
  id: m[1],
  name: m[2],
  sido: m[3],
  sigungu: m[4],
  specialty: m[5],
  categories: m[6].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean),
  landmark: Boolean(m[7]),
}));

let problems = 0;
const fail = (msg) => {
  console.error('  ✗ ' + msg);
  problems++;
};

console.log(`도서관 ${entries.length}곳 파싱됨\n`);

// 1) id 중복
const byId = new Map();
for (const e of entries) {
  if (byId.has(e.id)) fail(`id 중복: ${e.id} (${byId.get(e.id).name} / ${e.name})`);
  byId.set(e.id, e);
}

// 2) 이름 중복
const byName = new Map();
for (const e of entries) {
  if (byName.has(e.name)) fail(`이름 중복: ${e.name} (${byName.get(e.name).id} / ${e.id})`);
  byName.set(e.name, e);
}

// 3) 카테고리 유효성 / 최소 1개
for (const e of entries) {
  if (e.categories.length === 0) fail(`분류 없음: ${e.name}`);
  for (const c of e.categories) {
    if (!declaredCategories.includes(c)) fail(`알 수 없는 분류 '${c}': ${e.name}`);
  }
}

// 4) 지역 유효성
for (const e of entries) {
  if (!declaredSido.includes(e.sido)) fail(`알 수 없는 지역 '${e.sido}': ${e.name}`);
}

// 5) 지역별 분포
console.log('지역별');
for (const sido of declaredSido) {
  const n = entries.filter((e) => e.sido === sido).length;
  console.log(`  ${sido.padEnd(3)} ${String(n).padStart(3)}곳`);
  if (n === 0) fail(`'${sido}' 지역에 도서관이 하나도 없다 (필터가 빈 화면을 낳는다)`);
}

// 6) 분류별 분포 - 1곳뿐인 분류는 필터로서 쓸모가 없다
console.log('\n분류별');
for (const c of declaredCategories) {
  const n = entries.filter((e) => e.categories.includes(c)).length;
  console.log(`  ${c.padEnd(11)} ${String(n).padStart(3)}곳`);
  if (n === 0) fail(`'${c}' 분류에 도서관이 없다`);
  else if (n < 3) console.warn(`  ! '${c}' 는 ${n}곳뿐 — 분류로 유지할지 검토 필요`);
}

// 7) 랜드마크
const landmarks = entries.filter((e) => e.landmark);
console.log(`\n지역 대표 ${landmarks.length}곳`);
const lmSido = new Set(landmarks.map((e) => e.sido));
for (const sido of declaredSido) {
  if (!lmSido.has(sido)) console.warn(`  ! '${sido}' 에 대표 도서관 표시가 없다`);
}

console.log(
  problems === 0 ? '\n✓ 문제 없음' : `\n✗ 문제 ${problems}건`
);
process.exit(problems === 0 ? 0 : 1);
