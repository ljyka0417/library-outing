/**
 * 전국도서관표준데이터에서 운영시간을 받아 우리 132곳에 붙인다.
 *
 *   npm run collect-hours
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 이 자료인가
 * ─────────────────────────────────────────────────────────────
 * 정보나루(data4library)는 공공도서관 위주라 작은도서관·전문도서관이 빠진다.
 * 우리 132곳 중 56곳이 거기 없었다. 게다가 정보나루의 운영시간은 표준이 없는
 * 자유 문장이라("종합자료실 09:00~22:00(주말 17:00), 어린이실 …") 읽다가
 * 틀린 시각을 만들어 내기 쉽다.
 *
 * 행정안전부 「전국도서관표준데이터」는 3,554곳을 담고 있고, 무엇보다
 * **시각이 칸으로 나뉘어 있다** — 평일/토요일/공휴일 각각 시작·종료 시각.
 * 문장을 해석할 필요가 없으니 틀릴 자리가 없다.
 *
 * ─────────────────────────────────────────────────────────────
 * 엉뚱한 도서관을 붙이지 않으려고
 * ─────────────────────────────────────────────────────────────
 * 「중앙도서관」 같은 이름은 전국에 널려 있다. 그래서 이름만으로는 안 되고,
 * 우리가 아는 좌표에서 가까워야 받아들인다. 좌표가 없는 곳은 이름이 정확히
 * 같고 시·도까지 맞을 때만 받는다.
 *
 * 이 자료에는 인증키가 필요 없다. 포털이 화면에서 쓰는 것과 같은 주소다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/env.mjs';
import { strip, similarity, regionMatches } from './lib/match.mjs';

const BASE = 'https://www.data.go.kr';
const PUBLIC_DATA_PK = '15013109'; // 전국도서관표준데이터

/** 이 거리(m) 안이어야 같은 도서관으로 본다 */
const MAX_DISTANCE = 400;
/** 이름이 이만큼은 겹쳐야 한다 */
const MIN_SIMILARITY = 0.6;

const headers = {
  'User-Agent': 'Mozilla/5.0',
  Referer: `${BASE}/data/${PUBLIC_DATA_PK}/standard.do`,
  Accept: 'application/json',
};

/* ── 내려받기 ────────────────────────────────────────────── */

async function fetchAll() {
  const head = await (
    await fetch(`${BASE}/download/columList.json?pk=${PUBLIC_DATA_PK}&ext=csv`, { headers })
  ).json();

  const params = new URLSearchParams();
  head.tableVO.colNmList.forEach((c) => params.append('colNmList', c));
  params.set('totalCount', head.totalCount);
  params.set('svcTableNm', head.tableVO.svcTableNm);
  params.set('perPage', String(head.totalCount));
  // ⚠️ page 는 1부터다. 0 을 넣으면 빈 배열이 온다.
  params.set('page', '1');

  const rows = await (
    await fetch(`${BASE}/download/standard.json?publicDataPk=${PUBLIC_DATA_PK}&${params}`, {
      headers,
    })
  ).json();

  return rows.map((r) => ({
    name: String(r.LBRRY_NM ?? '').trim(),
    sido: String(r.CTPRVN_NM ?? '').trim(),
    type: String(r.LBRRY_SE ?? '').trim(),
    closed: String(r.CLOSE_DAY ?? '').trim(),
    weekday: [r.WEEKDAY_OPER_OPEN_HHMM, r.WEEKDAY_OPER_COLSE_HHMM],
    saturday: [r.SAT_OPER_OPER_OPEN_HHMM, r.SAT_OPER_CLOSE_HHMM],
    holiday: [r.HOLIDAY_OPER_OPEN_HHMM, r.HOLIDAY_CLOSE_OPEN_HHMM],
    address: String(r.RDNMADR ?? '').trim(),
    phone: String(r.PHONE_NUMBER ?? '').trim(),
    homepage: String(r.HOMEPAGE_URL ?? '').trim(),
    coords:
      Number.isFinite(Number(r.LATITUDE)) && Number(r.LATITUDE) !== 0
        ? { lat: Number(r.LATITUDE), lng: Number(r.LONGITUDE) }
        : undefined,
  }));
}

/* ── 시각 다루기 ─────────────────────────────────────────── */

/** "09:00" → 540. 못 읽으면 null. */
function toMinutes(text) {
  const m = /^(\d{1,2})\s*:\s*(\d{2})$/.exec(String(text ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

function span([open, close]) {
  const o = toMinutes(open);
  const c = toMinutes(close);
  if (o === null || c === null || c <= o) return null;
  return { open: o, close: c };
}

const DAY_TOKENS = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

/**
 * 휴관일 문구에서 **매주 쉬는 요일**만 뽑는다.
 *
 * 이 자료의 휴관일은 항목을 + 나 , 로 이어 붙인 모양이다.
 *   "월+일+국가지정공휴일"
 *   "금+일요일을 제외한 법정공휴일"
 *   "매월 두 번째, 네 번째 월요일, 일요일"
 *   "둘째·넷째 금요일+1월 1일+설날·추석 연휴"
 *
 * ⚠️ 한 도막이 요일 하나로 딱 떨어질 때만 받는다.
 *   "둘째·넷째 금요일" 은 매주가 아니라 한 달에 두 번이라 빼야 하고,
 *   "1월1일" 에는 '월' 과 '일' 이 들어 있어 그냥 훑으면 월·일요일이
 *   휴관으로 둔갑한다. "일요일을 제외한 법정공휴일" 도 마찬가지다.
 *   매주 쉬는 게 확실한 것만 지우고, 나머지는 원문을 화면에 보여준다.
 */
function weeklyClosedDays(closedText) {
  const days = new Set();
  for (const raw of String(closedText ?? '').split(/[+,·\/]/)) {
    const token = raw.trim();
    const m = /^(?:매주\s*)?([일월화수목금토])(?:요일)?$/.exec(token);
    if (m) days.add(DAY_TOKENS[m[1]]);
  }
  return [...days];
}

/**
 * 칸으로 나뉜 시각을 요일 배열로 만든다. [일,월,화,수,목,금,토]
 *
 * 공휴일 칸은 요일이 아니라 "공휴일" 이므로 일요일에 쓰지 않는다.
 * 일요일 시각을 따로 주지 않는 자료라, 일요일은 토요일과 같다고 본다 —
 * 주말을 한 묶음으로 적는 도서관이 대부분이다. 그러고 나서 휴관일 문구로
 * 쉬는 요일을 지운다.
 */
function buildByDay(row) {
  const wd = span(row.weekday);
  if (!wd) return undefined;
  const sat = span(row.saturday);

  const byDay = [
    sat ?? wd, // 일 — 토요일과 같다고 본다
    wd,
    wd,
    wd,
    wd,
    wd,
    sat ?? wd, // 토
  ];

  for (const idx of weeklyClosedDays(row.closed)) byDay[idx] = null;

  const fmt = (v) =>
    `${String(Math.floor(v.open / 60)).padStart(2, '0')}:${String(v.open % 60).padStart(2, '0')}~` +
    `${String(Math.floor(v.close / 60)).padStart(2, '0')}:${String(v.close % 60).padStart(2, '0')}`;

  const label = sat && (sat.open !== wd.open || sat.close !== wd.close)
    ? `평일 ${fmt(wd)} / 주말 ${fmt(sat)}`
    : fmt(wd);

  return { label, byDay };
}

/* ── 우리 목록과 맞추기 ──────────────────────────────────── */

function distance(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

function readSeeds() {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/libraries.mock.ts'), 'utf8');
  const seeds = [
    ...src.matchAll(/\{ id: '([^']+)', name: '([^']+)', sido: '([^']+)'([^}]*)\}/g),
  ].map((m) => ({ id: m[1], name: m[2], sido: m[3] }));

  const geo = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src/data/libraries.geocoded.json'), 'utf8')
  ).entries;

  return seeds.map((s) => ({ ...s, coords: geo[s.id]?.coords }));
}

/** 이 도서관에 해당하는 표준데이터 한 줄을 찾는다. 확신이 없으면 null. */
function findRow(seed, rows) {
  const scored = rows
    .map((r) => ({ r, sim: similarity(strip(seed.name), strip(r.name)) }))
    .filter((c) => c.sim >= MIN_SIMILARITY);

  if (scored.length === 0) return null;

  if (seed.coords) {
    const near = scored
      .filter((c) => c.r.coords)
      .map((c) => ({ ...c, dist: distance(seed.coords, c.r.coords) }))
      .filter((c) => c.dist <= MAX_DISTANCE)
      .sort((a, b) => a.dist - b.dist)[0];
    if (near) return { row: near.r, how: `좌표 ${near.dist}m`, sim: near.sim };
    // 좌표를 아는데 근처에 없다면 이름이 같아도 다른 도서관이다
    return null;
  }

  // 좌표가 없으면 이름이 거의 같고 시·도까지 맞을 때만
  const exact = scored
    .filter((c) => c.sim >= 0.95 && regionMatches(c.r.address, seed.sido))
    .sort((a, b) => b.sim - a.sim)[0];
  return exact ? { row: exact.r, how: '이름 일치', sim: exact.sim } : null;
}

/* ── 실행 ────────────────────────────────────────────────── */

console.log('전국도서관표준데이터를 받는 중...');
const rows = await fetchAll();
console.log(`  ${rows.length}곳\n`);

const seeds = readSeeds();
const out = {};
let matched = 0;
let noHours = 0;

for (const seed of seeds) {
  const hit = findRow(seed, rows);
  if (!hit) continue;

  const hours = buildByDay(hit.row);
  if (!hours) {
    noHours++;
    continue;
  }

  out[seed.id] = {
    _source: `전국도서관표준데이터 (${hit.row.name}, ${hit.how})`,
    matchedName: hit.row.name,
    hours,
    closedDays: hit.row.closed || undefined,
    address: hit.row.address || undefined,
    phone: hit.row.phone || undefined,
    homepage: hit.row.homepage || undefined,
  };
  matched++;
}

fs.writeFileSync(
  path.join(ROOT, 'src/data/libraries.standard.json'),
  JSON.stringify(
    {
      _readme:
        '행정안전부 전국도서관표준데이터에서 받은 운영시간입니다. 직접 고치지 마세요. ' +
        '다시 받으려면 npm run collect-hours. ' +
        '시각이 칸으로 나뉘어 있어 문장을 해석할 필요가 없습니다.',
      _generatedAt: new Date().toISOString(),
      _source: '행정안전부 전국도서관표준데이터 (data.go.kr/data/15013109)',
      entries: out,
    },
    null,
    2
  ) + '\n'
);

console.log(`끝.
  운영시간을 찾은 도서관 ${matched}곳 / ${seeds.length}곳
  찾았지만 시각이 비어 있던 곳 ${noHours}곳
  → src/data/libraries.standard.json
`);
