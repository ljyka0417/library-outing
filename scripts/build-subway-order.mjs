/**
 * 지하철 노선별 역 순서표 → src/data/subwayOrder.json
 *
 *   node scripts/build-subway-order.mjs [엑셀 파일]
 *   (기본: docs-내부자료/전체_도시철도역사정보_*.xlsx 가운데 가장 새것)
 *
 * 원본: 국가철도공단 「전국 도시철도 역사정보」(공공데이터포털 파일데이터, 철도데이터포털 KRIC 에서 내려받음).
 * 전광판의 "3전역 · 2전역 · 전역 · 이 역" 이름에 쓴다.
 *
 * 역번호가 노선 순서대로 매겨진 운영 구간만 쓴다(번호가 이어지는 곳을 한 줄로, 끊기면 지선으로 나눈다).
 * 코레일 구간(경부·경원·분당·경의중앙선 …)은 번호가 순서와 달라 넣지 않는다 — 화면은 간단한 선로로 보여 준다.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ROOT } from './lib/env.mjs';

const require = createRequire(import.meta.url);
const readXlsx = require('./lib/read-xlsx.cjs');

// 앱(카카오) 노선 이름 → 엑셀 노선명(운영 구간). 순서가 이어지는 구간만.
const SEGMENTS = {
  '1호선': ['1호선'],
  '2호선': ['2호선'],
  '3호선': ['3호선'],
  '4호선': ['진접선', '4호선'],
  '5호선': ['5호선'],
  '6호선': ['6호선'],
  '7호선': ['7호선', '도시철도 7호선'],
  '8호선': ['수도권 광역철도 8호선', '8호선'],
  '9호선': ['서울 도시철도 9호선', '수도권  도시철도 9호선'],
  신분당선: ['신분당선'],
  신림선: ['수도권 경량도시철도 신림선'],
  우이신설선: ['우이신설선'],
  의정부경전철: ['의정부'],
  에버라인: ['에버라인'],
  김포골드라인: ['김포도시철도'],
  인천1호선: ['인천지하철 1호선'],
  인천2호선: ['인천지하철 2호선'],
  부산1호선: ['부산 도시철도 1호선'],
  부산2호선: ['부산 도시철도 2호선'],
  부산3호선: ['부산 도시철도 3호선'],
  부산4호선: ['부산 경량도시철도 4호선'],
  부산김해경전철: ['부산김해경전철'],
  대구1호선: ['대구 도시철도 1호선'],
  대구2호선: ['대구 도시철도 2호선'],
  대구3호선: ['대구 도시철도 3호선'],
  대전1호선: ['대전 도시철도 1호선'],
  광주1호선: ['광주도시철도 1호선'],
};
// 순환선 — 첫 줄(본선)의 끝과 처음이 이어진다
const CIRCULAR = new Set(['2호선']);

const file =
  process.argv[2] ??
  fs
    .readdirSync(path.join(ROOT, 'docs-내부자료'))
    .filter((f) => /도시철도역사정보.*\.xlsx$/.test(f))
    .sort()
    .map((f) => path.join(ROOT, 'docs-내부자료', f))
    .pop();
if (!file) {
  console.error('엑셀 파일이 없어요. docs-내부자료 에 「전체_도시철도역사정보_*.xlsx」 를 넣어 주세요.');
  process.exit(1);
}

// xlsx = zip. tar(bsdtar)는 윈도우 10+·맥에 기본으로 있다
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'subway-'));
// 윈도우는 Git Bash 의 GNU tar 가 먼저 잡히면 'C:' 를 원격 주소로 읽어 실패한다 — 윈도우 기본 tar 를 쓴다
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-xf', file, '-C', tmp]);
const [head, ...rows] = readXlsx(tmp);
fs.rmSync(tmp, { recursive: true, force: true });

const col = (re) => head.findIndex((h) => re.test(h));
const C = { code: col(/역번호/), name: col(/역사명/), line: col(/노선명/) };
const num = (code) => parseInt(String(code).replace(/\D/g, ''), 10);
// "흑석(중앙대입구)" → "흑석" (실시간 데이터·카카오 이름과 맞추려고)
// '역' 을 먼저 떼야 "쌍용(나사렛대)역" 의 괄호도 떨어진다
const short = (n) => String(n).replace(/역$/, '').replace(/\s*\(.*\)\s*$/, '').replace(/역$/, '').trim();

const out = {};
for (const [appLine, segs] of Object.entries(SEGMENTS)) {
  const st = rows
    .filter((r) => segs.includes(r[C.line]))
    .map((r) => ({ code: r[C.code], n: num(r[C.code]), name: short(r[C.name]) }))
    .filter((s) => Number.isFinite(s.n))
    .sort((a, b) => a.n - b.n);
  const runs = [];
  let cur = [];
  for (const s of st) {
    const prev = cur[cur.length - 1];
    if (prev && s.n === prev.n) continue; // 같은 번호가 두 번(구간 경계)
    if (prev && s.n - prev.n !== 1) {
      runs.push(cur);
      cur = [];
    }
    cur.push(s);
  }
  if (cur.length) runs.push(cur);
  out[appLine] = { circular: CIRCULAR.has(appLine), runs: runs.map((r) => r.map((s) => s.name)) };
}

/*
 * 1호선 — 청량리~서울역만 "1호선"(서울교통공사)이고 나머지는 경원·경부·경인·장항선(코레일)으로 나뉘어 있다.
 * 코레일 역번호는 순서가 섞여 있어서(독산 1714 가 수원 1713 뒤) 번호 대신 **좌표**로 잇는다:
 * 정해 둔 출발역에서 아직 안 쓴 역 가운데 가장 가까운 역을 차례로 붙인다(지선 갈래는 따로 한 줄).
 *   본선   연천 … 창동 · 회기 … 청량리 … 서울역 · 남영 … 신도림 · 구로 · (경인선) … 인천
 *   경부선 구로 · 가산디지털단지 … 천안 · (장항선) … 신창
 */
{
  const C2 = { lat: col(/역위도/), lng: col(/역경도/) };
  const st = (segs) =>
    rows
      .filter((r) => segs.includes(r[C.line]))
      .map((r) => ({ code: r[C.code], n: num(r[C.code]), name: short(r[C.name]), lat: Number(r[C2.lat]), lng: Number(r[C2.lng]) }))
      // 원본에 같은 역이 두 줄인 곳이 있다(주안)
      .filter((s, i, a) => a.findIndex((x) => x.name === s.name) === i);
  const R = 6371000;
  const rad = Math.PI / 180;
  const dist = (a, b) => Math.hypot((b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad), (b.lat - a.lat) * rad) * R;
  /** start 부터 가장 가까운 역을 차례로 — 다음 역이 maxGap 보다 멀면 멈춘다 */
  const chain = (start, pool, maxGap = 6000) => {
    const left = pool.filter((s) => s.name !== start.name);
    const out = [];
    let cur = start;
    while (left.length) {
      let bi = -1;
      let bd = Infinity;
      left.forEach((s, i) => {
        const d = dist(cur, s);
        if (d < bd) [bd, bi] = [d, i];
      });
      if (bd > maxGap) break;
      cur = left.splice(bi, 1)[0];
      out.push(cur);
    }
    return out;
  };
  const by = (list, name) => list.find((s) => s.name === name);
  const gyeongwon = st(['경원선']).filter((s) => s.n >= 1015); // 회기 위쪽 (용산~왕십리 쪽은 경의중앙선 구간)
  const seoulMetro = st(['1호선']).sort((a, b) => a.n - b.n); // 청량리 … 서울역
  const gyeongbuNorth = st(['경부선']).filter((s) => s.n >= 1002 && s.n <= 1007).sort((a, b) => a.n - b.n); // 남영 … 신도림
  const guro = by(st(['경부선']), '구로');
  const gyeongin = st(['경인선']);
  const gyeongbuSouth = st(['경부선']).filter((s) => s.n >= 1702 && !['광명', '서동탄'].includes(s.name));
  const janghang = st(['장항선']);

  // 역 사이가 먼 곳(전곡~연천 · 평택~성환 …)이 있어 북쪽·남쪽은 넉넉히 잇는다
  const north = chain(seoulMetro[0], gyeongwon, 12000).reverse(); // 연천 … 회기
  const trunk = [...north, ...seoulMetro, ...gyeongbuNorth, guro, ...chain(guro, gyeongin)];
  const south = [guro, ...chain(guro, gyeongbuSouth, 12000)];
  const southEnd = south[south.length - 1];
  const toShinchang = chain(southEnd, janghang, 12000);
  out['1호선'] = { circular: false, runs: [trunk.map((s) => s.name), [...south, ...toShinchang].map((s) => s.name)] };
}

const dest = path.join(ROOT, 'src', 'data', 'subwayOrder.json');
fs.writeFileSync(dest, JSON.stringify({ source: path.basename(file), lines: out }) + '\n');
const count = Object.values(out).reduce((a, l) => a + l.runs.reduce((b, r) => b + r.length, 0), 0);
console.log(`노선 ${Object.keys(out).length}개 · 역 ${count}곳 → ${path.relative(ROOT, dest)}`);
