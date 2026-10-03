/**
 * 가이드북 『오늘 도서관 갈래?』 최종본에 실린 도서관별 "운영 프로그램"을 앱으로 가져온다.
 *
 *   npm run import-book-programs
 *
 * 원본: docs-내부자료/책-최종본-도서관.json (책 PDF 에서 뽑은 127곳)
 * 결과: src/data/book-programs.generated.json  { byId: { 앱도서관id: { programs: [...] } } }
 *
 * 앱 이름은 책 표기에 맞춰 두었다(2026-10-03). 그래도 공백을 빼고 똑같은 이름 →
 * 한쪽이 다른 쪽을 포함 → 아래 ALIAS 순으로 짝을 짓는다 — 나중에 이름이 갈라져도 버티게.
 * 짝을 못 찾은 곳은 지어내지 않고 건너뛰며, 마지막에 목록으로 알려 준다.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const load = require('./lib/load-app-ts.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SRC = path.join(root, 'docs-내부자료', '책-최종본-도서관.json');
const OUT = path.join(root, 'src', 'data', 'book-programs.generated.json');

/** 책 표기 → 앱 id (자동으로 못 맞추는 곳만). 지금은 없다 */
const ALIAS = {};

/**
 * PDF 에서 뽑을 때 디자인상 조각난 이름을 바로잡는다 (책 지면 기준).
 * 강릉모루도서관: 「몸·물건·마음」이 "· 몸" "· 물건" "마음" 으로 쪼개져 나왔다.
 */
const FIX = {
  '4-3': ['몸·물건·마음', '베스트셀러 읽기', '오일파스텔 동화'],
};

const norm = (s) => (s || '').replace(/\s+/g, '');
const book = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const app = load('src/data/libraries.mock.ts').MOCK_LIBRARIES;

const byId = {};
const unmatched = [];
const used = new Set();
for (const b of book) {
  const n = norm(b.name);
  let a = ALIAS[n] ? app.find((x) => x.id === ALIAS[n]) : null;
  a ??= app.find((x) => !used.has(x.id) && norm(x.name) === n);
  a ??= app.find((x) => !used.has(x.id) && (norm(x.name).includes(n) || n.includes(norm(x.name))));
  if (!a) { unmatched.push(`${b.code} ${b.name}`); continue; }
  used.add(a.id);
  const programs = (FIX[b.code] ?? b.programs ?? []).map((p) => p.trim()).filter(Boolean);
  if (programs.length) byId[a.id] = { programs, bookCode: b.code };
}

fs.writeFileSync(OUT, JSON.stringify({
  source: '가이드북 『오늘 도서관 갈래?』 (2026년 9월 9일 초판)',
  generatedAt: new Date().toISOString(),
  byId,
}, null, 2) + '\n');

console.log(`운영 프로그램이 있는 도서관 ${Object.keys(byId).length}곳 → ${path.relative(root, OUT)}`);
if (unmatched.length) console.log(`앱에 없어 건너뜀 ${unmatched.length}곳: ${unmatched.join(', ')}`);
const noPrograms = book.filter((b) => !(b.programs || []).length).map((b) => b.name);
if (noPrograms.length) console.log(`책에 프로그램이 없는 곳: ${noPrograms.join(', ')}`);
