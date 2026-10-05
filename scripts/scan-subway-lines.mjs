/**
 * 도서관 127곳 근처(1km) 지하철역과 노선을 한 번에 훑는다 — 노선 색(subwayLineColor)에 빠진 노선이 없는지 보려고.
 *
 *   node scripts/scan-subway-lines.mjs
 *
 * 서버 /subway 와 같은 규칙(카카오 지하철역 분류 SW8, 1km, 가까운 두 역)을 쓴다. 실시간·시간표는 부르지 않는다.
 * 결과: docs-내부자료/도서관-지하철역.md (올리지 않는 폴더)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';

const require = createRequire(import.meta.url);
const load = require('./lib/load-app-ts.cjs');
const { MOCK_LIBRARIES } = load('src/data/libraries.mock.ts');
const { lineColor } = load('src/utils/subwayLineColor.ts');
const KEY = requireEnv('KAKAO_REST_KEY', '.env 에 KAKAO_REST_KEY 를 넣어 주세요.');

async function stations(c) {
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=SW8&x=${c.lng}&y=${c.lat}&radius=1000&sort=distance&size=15`,
    { headers: { Authorization: `KakaoAK ${KEY}` } }
  );
  const docs = (await res.json())?.documents ?? [];
  const groups = [];
  for (const d of docs) {
    const m = String(d.place_name).match(/^(.+?)역(?:\s+(.+))?$/);
    if (!m) continue;
    const name = m[1].trim();
    const line = (m[2] ?? '').trim();
    const g = groups.find((x) => x.name === name);
    if (g) {
      if (line && !g.lines.includes(line)) g.lines.push(line);
    } else groups.push({ name, lines: line ? [line] : [], dist: Number(d.distance) });
  }
  return groups.sort((a, b) => a.dist - b.dist).slice(0, 2);
}

const rows = [];
const allLines = new Map();
for (const lib of MOCK_LIBRARIES) {
  if (!lib.coords) continue;
  const st = await stations(lib.coords);
  for (const s of st) for (const l of s.lines) allLines.set(l, (allLines.get(l) ?? 0) + 1);
  rows.push({ lib, st });
  await sleep(120);
}

const missing = [...allLines.keys()].filter((l) => !lineColor(l));
const out = [
  '# 도서관 근처 지하철역 (1km · 가까운 두 역)',
  '',
  `도서관 ${rows.length}곳 중 역이 있는 곳 ${rows.filter((r) => r.st.length).length}곳 · 노선 ${allLines.size}개`,
  '',
  '## 노선 (도서관 수)',
  '',
  ...[...allLines.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => `- ${l} — ${n}곳 · 색 ${lineColor(l)?.bg ?? '❌ 없음'}`),
  '',
  missing.length ? `**색이 없는 노선: ${missing.join(', ')}**` : '색이 없는 노선: 없음',
  '',
  '## 도서관별',
  '',
  '| 도서관 | 지역 | 역 |',
  '|---|---|---|',
  ...rows.map(({ lib, st }) => `| ${lib.name} | ${lib.region.sido} ${lib.region.sigungu ?? ''} | ${st.map((s) => `${s.name}역(${s.lines.join('·')}) ${s.dist}m`).join(' / ') || '—'} |`),
];
const file = path.join(ROOT, 'docs-내부자료', '도서관-지하철역.md');
fs.writeFileSync(file, out.join('\n') + '\n');
console.log(`노선 ${allLines.size}개, 색 없는 노선 ${missing.length}개 → ${path.relative(ROOT, file)}`);
if (missing.length) console.log('없음:', missing.join(', '));
