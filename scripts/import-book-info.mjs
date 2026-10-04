/**
 * 가이드북 『오늘 도서관 갈래?』 최종본의 도서관별 "기본 정보" 표를 앱으로 가져온다.
 *
 *   npm run import-book-info
 *
 * 원본: docs-내부자료/책-최종본-도서관.json (책 PDF 에서 뽑은 127곳)
 * 결과: src/data/libraries.book.json  { entries: { 앱도서관id: {...} } }
 *
 * 책 표의 일곱 칸(주소·운영시간·홈페이지·연락처·개관일·장서수·교통)과 특화 주제를 옮긴다.
 * 앱의 다른 자료(정보나루·표준데이터·카카오)보다 앞선다 — 책은 지은이가 직접 확인한 값이다.
 *
 * 운영시간은 책 문구를 그대로 보여 주고(label), "지금 운영중" 판정을 위해 요일별 시간(byDay)과
 * 격주 휴관(closedNth)으로도 풀어 둔다. 풀 수 없는 문구는 byDay 를 비워서 판정을 숨긴다.
 * 지어내느니 비운다.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const load = require('./lib/load-app-ts.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SRC = path.join(root, 'docs-내부자료', '책-최종본-도서관.json');
const OUT = path.join(root, 'src', 'data', 'libraries.book.json');

/**
 * 책 표기 → 앱 id. 지금은 앱 이름을 전부 책 표기로 맞춰서 비어 있다.
 * 앞으로 이름이 갈라지는 곳이 생기면 여기에 적는다 (공백 뺀 책 이름: 앱 id).
 */
const ALIAS = {};

/** 책의 특화 주제 → 앱 주제 id */
const SPECIALTY = {
  랜드마크: 'landmark', 법률: 'law', '자연·환경': 'nature', 음식: 'food', 음악: 'music',
  예술: 'art', 인문: 'humanities', 어린이: 'kids', 어학: 'language', 미디어: 'media',
  과학: 'science', 여행: 'travel', 교육: 'education',
};

/**
 * 운영시간 해석용으로만 고쳐 쓴 문구 (화면에는 책 원문이 그대로 나간다).
 * 괄호 안에 요일별 시간이 들어 있거나, 문장으로 적혀 있어 규칙으로 못 읽는 곳.
 */
const HOURS_FOR_PARSE = {
  '1-6': '월~금 09:00~18:00',
  '1-7': '월~토 09:00~18:00 / 일 휴관',
  '2-5': '화~금 09:00~21:00 / 주말 09:00~18:00',
  '4-6': '09:00~22:00 / 금 휴관',
  '8-2': '월~토 09:00~22:00 / 일 09:00~18:00 / 1·3주 수 휴관',
  '12-2': '화~금 09:00~20:00 / 주말 09:00~18:00 / 월 휴관',
  '12-7': '화~금 09:00~20:00 / 주말 09:00~18:00 / 월 휴관',
  '13-5': '화~금 09:00~22:00 / 토 09:00~18:00 / 일 09:00~17:00 / 월 휴관',
  '13-7': '평일 09:00~22:00 / 주말 09:00~18:00',
  '13-9': '화~금 09:00~22:00 / 토 09:00~18:00 / 일 09:00~17:00',
  '13-11': '화~금 09:00~22:00 / 토 09:00~18:00 / 일 09:00~17:00',
};
/** 휴관일을 책이 밝히지 않아 "지금 운영중"을 판정하지 않는 곳 */
const HOURS_UNKNOWN = new Set([]);
/**
 * 책이 휴관일을 밝히지 않아 공식 자료로 채운 곳 (2026-10-04).
 * 여는 시간은 책 그대로 두고, 책에 빠진 쉬는 날만 도서관 공식 안내에서 가져온다 — 책과 어긋나지 않는다.
 * 예전엔 판정을 숨겼는데("지어내느니 비운다"), 근거가 있는 휴관일이라 채워서 운영중 배지를 띄운다.
 *   parse       판정용으로만 고쳐 쓴 문구 (화면에는 책 원문)
 *   closedDays  화면·달곰이가 말하는 휴관일 (출처를 함께 적는다)
 *   holidays    공휴일 규칙 (둘 다 공휴일 휴관. 일요일과 겹친 공휴일은 열지만 규칙으로는 담지 못해 휴관으로 본다)
 */
const CLOSURE_FROM_OFFICIAL = {
  // 국립중앙도서관 이용안내(nl.go.kr): 매월 둘째·넷째 월요일, 일요일을 제외한 관공서 공휴일 휴관. 수요일은 21:00까지
  '1-2': {
    parse: '수 09:00~21:00 / 09:00~18:00 / 둘째·넷째 월 휴관',
    closedDays: '매월 둘째·넷째 월요일 / 공휴일 (국립중앙도서관 이용안내)',
    holidays: 'closed',
  },
  // 전국도서관표준데이터·정보나루: 매월 첫째 월요일(정비의 날), 일요일을 제외한 공휴일 휴관. 자료실 09:00~22:00 (책)
  '8-10': {
    parse: '09:00~22:00 / 첫째 월 휴관',
    closedDays: '매월 첫째 월요일 / 공휴일 (전국도서관표준데이터)',
    holidays: 'closed',
  },
};
/** 책이 "본관 휴관"이라 적은 곳 — 매일 휴관으로 본다 */
const HOURS_CLOSED = new Set(['14-1']);

const DAY = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const NTH = { 첫째: 1, 둘째: 2, 셋째: 3, 넷째: 4 };

/** "화~금", "토,일", "평일", "월~목·주말", "화·수·금~일" → 요일 번호들. 모르는 말이 있으면 null */
function parseDays(text) {
  const t = text.replace(/요일|매주|공휴일/g, '').trim();
  if (!t) return [];
  const out = new Set();
  for (const raw of t.split(/[·,\s]+/).filter(Boolean)) {
    if (raw === '평일') [1, 2, 3, 4, 5].forEach((d) => out.add(d));
    else if (raw === '주말') [6, 0].forEach((d) => out.add(d));
    else if (/^[일월화수목금토]~[일월화수목금토]$/.test(raw)) {
      for (let d = DAY[raw[0]]; ; d = (d + 1) % 7) { out.add(d); if (d === DAY[raw[2]]) break; }
    } else if (/^[일월화수목금토]$/.test(raw)) out.add(DAY[raw]);
    else return null;
  }
  return [...out];
}

const T = String.raw`(\d{1,2})(?::(\d{2}))?\s*시?`;
const OPEN_RE = new RegExp(String.raw`^(.*?)\s*(?:${T})?\s*~\s*${T}\s*$`);
const min = (h, m) => Number(h) * 60 + Number(m || 0);

/** 운영시간 문구 → { byDay, closedNth } 또는 풀지 못하면 null */
function parseHours(text) {
  // "12/31" 의 빗금은 칸 나눔이 아니다
  const s = text.replace(/\([^)]*\)/g, ' ').replace(/12\/31/g, '12월 31일').replace(/\|/g, '/');
  const byDay = Array(7).fill(undefined);
  const closedNth = [];
  let explicit = false;
  let lastOpen = null;
  for (const seg of s.split('/').map((x) => x.trim()).filter(Boolean)) {
    if (seg.includes('휴관')) {
      const c = seg.replace(/휴관|매주|매월|및|법정|공휴일|신정|설|추석|12\/31|12월\s*31일|등|요일/g, ' ');
      const nth = c.match(/((?:첫째|둘째|셋째|넷째|[1-5])(?:\s*[·,]\s*(?:첫째|둘째|셋째|넷째|[1-5]))*)\s*(째|주)?\s*([일월화수목금토])/);
      if (nth && (nth[2] || /째/.test(nth[1]))) {
        const weeks = nth[1].split(/\s*[·,]\s*/).map((w) => NTH[w] ?? Number(w));
        closedNth.push({ day: DAY[nth[3]], weeks });
        continue;
      }
      const last = c.match(/마지막\s*([일월화수목금토])/);
      if (last) { closedNth.push({ day: DAY[last[1]], weeks: [-1] }); continue; }
      const days = parseDays(c.replace(/\s+/g, ' '));
      if (days === null) return null;
      days.forEach((d) => (byDay[d] = null));
      continue;
    }
    for (const part of seg.split(/,\s+/)) {
      const m = part.match(OPEN_RE);
      if (!m) return null;
      const days = parseDays(m[1].replace(/자료실/g, ''));
      if (days === null) return null;
      const open = m[2] !== undefined ? min(m[2], m[3]) : lastOpen;
      if (open == null) return null;
      const range = { open, close: min(m[4], m[5]) };
      lastOpen = open;
      if (days.length) { explicit = true; days.forEach((d) => byDay[d] === undefined && (byDay[d] = range)); }
      else for (let d = 0; d < 7; d++) if (byDay[d] === undefined) byDay[d] = range;
    }
  }
  // 열리는 요일을 밝혀 적은 문구에서 빠진 요일은 쉬는 날로 본다 ("화~일 …" 이면 월요일 휴관)
  for (let d = 0; d < 7; d++) if (byDay[d] === undefined) byDay[d] = explicit ? null : undefined;
  if (byDay.some((x) => x === undefined)) return null;
  if (byDay.every((x) => x === null)) return null;
  return { byDay, ...(closedNth.length ? { closedNth } : {}) };
}

/**
 * 공휴일 규칙 (책 원문에서 읽는다 — 괄호 속 「주말·공휴일 ~18:00」까지 봐야 해서).
 *   'weekend'  공휴일엔 주말(일요일) 시간으로 연다   「주말·공휴일 09:00~19:00」
 *   'closed'   공휴일엔 쉰다                        「월·공휴일 휴관」「법정공휴일 휴관」
 *   [이름…]    그 명절만 쉰다                       「월·신정·설·추석 휴관」
 * 이름은 특일 정보 API 의 dateName 과 맞춘다(신정 = "1월1일").
 * 책이 공휴일을 말하지 않은 곳은 규칙을 두지 않는다 — 평소 요일대로 판정한다.
 */
function holidayRule(text) {
  if (/공휴일\s*[~\d]/.test(text)) return 'weekend';
  const closure = text.replace(/12\/31/g, '12월 31일').split(/[/|]/).find((s) => s.includes('휴관') && !s.includes('휴관일')) ?? '';
  if (/공휴일/.test(closure)) return 'closed';
  const names = [['신정', '1월1일'], ['설', '설날'], ['추석', '추석']].filter(([w]) => closure.includes(w)).map(([, n]) => n);
  return names.length ? names : undefined;
}
/** 해마다 같은 날 쉬는 날 ('MM-DD') — 「12월 31일 휴관」 */
const closedDatesOf = (text) => (/12월\s*31일|12\/31/.test(text) ? ['12-31'] : undefined);

/**
 * 운영시간 문구에서 휴관 부분만 떼어 낸다 (「… / 월·공휴일 휴관」 → 「월·공휴일」).
 * 달곰이가 "휴관일은 언제야?"에 답할 때 쓴다. 책이 휴관일을 적지 않은 곳은 비운다.
 */
function closedPart(code, label) {
  if (code === '14-1') return '본관 휴관 중 (2026.07.01~2027년 10월 예정)';
  for (const seg of label.replace(/12\/31/g, '12월 31일').split(/[/|]/)) {
    const colon = seg.match(/휴관\s*:\s*(.+)$/);
    if (colon) return colon[1].trim();
    // 「휴관일·공휴일 제외」(국립중앙도서관)는 휴관일을 밝힌 말이 아니다
    if (seg.includes('휴관') && !seg.includes('휴관일')) return seg.replace(/\s*휴관\s*/, ' ').trim();
  }
  return undefined;
}

const norm = (s) => (s || '').replace(/\s+/g, '');
const book = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const app = load('src/data/libraries.mock.ts').MOCK_LIBRARIES;

const entries = {};
const unmatched = [];
const hoursHidden = [];
const used = new Set();
for (const b of book) {
  const n = norm(b.name);
  let a = ALIAS[n] ? app.find((x) => x.id === ALIAS[n]) : null;
  a ??= app.find((x) => !used.has(x.id) && norm(x.name) === n);
  a ??= app.find((x) => !used.has(x.id) && (norm(x.name).includes(n) || n.includes(norm(x.name))));
  if (!a) { unmatched.push(`${b.code} ${b.name}`); continue; }
  used.add(a.id);

  const category = SPECIALTY[b.specialty];
  if (!category) throw new Error(`모르는 특화 주제: ${b.code} ${b.specialty}`);

  let hours;
  if (b.hours) {
    if (HOURS_CLOSED.has(b.code)) hours = { label: b.hours, byDay: Array(7).fill(null) };
    else {
      const official = CLOSURE_FROM_OFFICIAL[b.code];
      const parsed = HOURS_UNKNOWN.has(b.code) ? null : parseHours(official?.parse ?? HOURS_FOR_PARSE[b.code] ?? b.hours);
      if (!parsed) hoursHidden.push(`${b.code} ${b.name}`);
      const holidays = parsed ? official?.holidays ?? holidayRule(b.hours) : undefined;
      const closedDates = parsed ? closedDatesOf(b.hours) : undefined;
      hours = { label: b.hours, ...(parsed ?? {}), ...(holidays ? { holidays } : {}), ...(closedDates ? { closedDates } : {}) };
    }
  }

  // 주소도 책 그대로 — 행정구역 개편 뒤 이름(인천 검단구·서해구 …, 전남광주통합특별시)까지 (2026-10-03 결정)
  const address = b.address;

  const homepage = b.homepage && !/^https?:\/\//.test(b.homepage) ? `https://${b.homepage}` : b.homepage;

  entries[a.id] = {
    bookCode: b.code,
    specialty: b.specialty,
    category,
    ...(address ? { address } : {}),
    ...(hours ? { hours } : {}),
    ...(hours && CLOSURE_FROM_OFFICIAL[b.code]
      ? { closedDays: CLOSURE_FROM_OFFICIAL[b.code].closedDays }
      : hours && closedPart(b.code, b.hours)
        ? { closedDays: closedPart(b.code, b.hours) }
        : {}),
    ...(homepage ? { homepage } : {}),
    ...(b.phone ? { phone: b.phone } : {}),
    ...(b.opened ? { opened: b.opened } : {}),
    ...(b.holdings ? { holdings: b.holdings } : {}),
    ...(b.transit ? { transit: b.transit } : {}),
  };
}

fs.writeFileSync(OUT, JSON.stringify({
  source: '가이드북 『오늘 도서관 갈래?』 (2026년 9월 9일 초판) 도서관별 기본 정보 표',
  _readme: '직접 고치지 마세요 — npm run import-book-info 가 덮어씁니다. 고칠 값은 libraries.manual.json 이 아니라 책 자료(docs-내부자료)나 이 스크립트에서.',
  generatedAt: new Date().toISOString(),
  entries,
}, null, 2) + '\n');

console.log(`책 기본 정보 ${Object.keys(entries).length}곳 → ${path.relative(root, OUT)}`);
if (unmatched.length) console.log(`앱에 없어 건너뜀 ${unmatched.length}곳: ${unmatched.join(', ')}`);
if (hoursHidden.length) console.log(`"지금 운영중"을 판정하지 않는 곳 ${hoursHidden.length}곳: ${hoursHidden.join(', ')}`);

if (process.argv.includes('--show-hours')) {
  const fmt = (r) => (r === null ? '휴관' : `${String(r.open / 60 | 0).padStart(2, '0')}:${String(r.open % 60).padStart(2, '0')}-${String(r.close / 60 | 0).padStart(2, '0')}:${String(r.close % 60).padStart(2, '0')}`);
  for (const e of Object.values(entries)) {
    const h = e.hours;
    if (!h) continue;
    const days = h.byDay ? h.byDay.map((r, i) => `${'일월화수목금토'[i]} ${fmt(r)}`).join(' | ') : '(판정 안 함)';
    const nth = h.closedNth ? '  격주휴관 ' + h.closedNth.map((c) => `${c.weeks.join(',')}주 ${'일월화수목금토'[c.day]}`).join(', ') : '';
    console.log(`${e.bookCode.padEnd(6)}${h.label}\n      ${days}${nth}`);
  }
}
