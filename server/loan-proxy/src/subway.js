/**
 * 도서관 근처 지하철역과 다음 열차 — 버스 칸처럼 "○분 후" (전국).
 *
 *   GET /subway?lat=37.5663&lng=126.9779
 *   → { stations: [{ name, lines: ['1호선','2호선'], dist, live: [{ line, dir, to, min, msg }] | null, kind: 'live' | 'schedule' | null }] }
 *
 *   역      카카오 장소 검색(지하철역 분류 SW8, KAKAO_REST_KEY) — 1km 안 가까운 두 곳. 좌표마다 30일 기억.
 *           "시청역 1호선" · "시청역 2호선" 은 한 역으로 묶는다.
 *   수도권  서울 열린데이터광장 지하철 실시간 도착(SEOUL_SUBWAY_KEY) — kind 'live'. 역마다 1분 기억
 *           (하루 1,000번 한도 — 활용사례 등록 전).
 *   그 밖   국토교통부 TAGO 지하철 시간표(DATA_GO_KR_KEY)의 다음 열차 — kind 'schedule'. 시간표는 하루 기억.
 *           실시간이 비거나 실패한 수도권 역도 시간표로 채운다.
 */
import { remembered } from './remember.js';
import ORDER from '../../../src/data/subwayOrder.json';
const STATIONS_TTL = 30 * 24 * 3600;
const LIVE_TTL = 60;

const LINE = {
  1001: '1호선', 1002: '2호선', 1003: '3호선', 1004: '4호선', 1005: '5호선', 1006: '6호선', 1007: '7호선', 1008: '8호선', 1009: '9호선',
  1061: '중앙선', 1063: '경의중앙선', 1065: '공항철도', 1067: '경춘선', 1075: '수인분당선', 1077: '신분당선', 1081: '경강선',
  1092: '우이신설선', 1093: '서해선', 1094: '신림선', 1032: 'GTX-A',
};

/**
 * 노선 양 끝 종착역 — 전광판 머리말을 "다음 역 방면"(노들 방면)이 아니라 "종착역 방면"(중앙보훈병원 방면)으로.
 * 같은 방향 열차들의 행선지 가운데 종착역이 있으면 그 이름, 없으면(단축 운행만 보일 때) 반대 방향에서
 * 알아낸 상행·하행 짝으로 정하고, 그래도 모르면 행선지 이름을 그대로 쓴다. 2호선은 내선·외선 순환.
 */
const TERMINALS = {
  '1호선': ['소요산', '연천', '인천', '신창'],
  '3호선': ['대화', '오금'],
  '4호선': ['진접', '당고개', '오이도'],
  '5호선': ['방화', '하남검단산', '마천'],
  '6호선': ['응암', '신내'],
  '7호선': ['장암', '석남'],
  '8호선': ['별내', '모란'],
  '9호선': ['개화', '중앙보훈병원'],
  경의중앙선: ['문산', '지평', '용문'],
  중앙선: ['문산', '지평', '용문'],
  공항철도: ['서울역', '인천공항2터미널'],
  경춘선: ['청량리', '상봉', '춘천'],
  수인분당선: ['청량리', '인천'],
  신분당선: ['신사', '광교'],
  우이신설선: ['북한산우이', '신설동'],
  신림선: ['샛강', '관악산'],
  서해선: ['일산', '대곡', '원시'],
  경강선: ['판교', '여주'],
  'GTX-A': ['운정중앙', '동탄', '수서'],
};
/** 갈래가 많은 노선은 끝역 하나로 못 정한다 — 방향 묶음으로 (1호선: 소요산·광운대 쪽 / 인천·신창 쪽 — 어느 역에서나 앞쪽인 끝역 이름) */
const DIRSETS = {
  '1호선': [
    { label: '소요산·광운대', set: ['소요산', '연천', '동두천', '양주', '의정부', '도봉산', '창동', '광운대', '청량리', '서울역', '용산', '동묘앞'] },
    { label: '인천·신창', set: ['인천', '동인천', '부평', '구로', '광명', '수원', '병점', '서동탄', '천안', '신창', '영등포'] },
  ],
};
/*
 * 1호선은 행선지로 방향을 정하면 틀린다(시청에서 남쪽으로 가는 열차인데 '동묘앞행' 이 섞여 북쪽으로 분류).
 * 서울시 데이터의 다음 역("서울방면")을 앱 역 순서표(src/data/subwayOrder.json)에서 찾아 끝 쪽으로 정한다.
 */
const ORDER_ENDS = {
  '1호선': [
    ['소요산·광운대', '인천·신창'], // 본선: 연천 … 청량리 … 서울역 … 구로 … 인천
    ['소요산·광운대', '천안·신창'], // 경부선: 구로 … 천안 … 신창
  ],
};
const normName = (n) =>
  String(n ?? '').replace(/방면$/, '').replace(/역$/, '').replace(/\s*\(.*\)\s*$/, '').replace(/역$/, '').replace(/\s+/g, '').trim();
function towardByOrder(line, station, dir) {
  const ends = ORDER_ENDS[line];
  const runs = ORDER.lines?.[line]?.runs;
  if (!ends || !runs || !dir) return null;
  const me = normName(station);
  const next = normName(dir);
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r].map(normName);
    const i = run.indexOf(me);
    const j = run.indexOf(next);
    if (i >= 0 && j >= 0 && i !== j) return ends[r]?.[j < i ? 0 : 1] ?? null;
  }
  return null;
}
const plain = (to) => String(to ?? '').replace(/행$/, '').replace(/\s*\(.*\)$/, '').trim();

/** 같은 방향(group)마다 머리말 이름 — [{ group, line, ud, tos[] }] → Map(group → "개화") */
function towardOf(groups, station) {
  const out = new Map();
  const udTerm = new Map(); // `${line}|${ud}` → 종착역 (짝 맞추기용)
  for (const g of groups) {
    if (g.line === '2호선' && /내선|외선/.test(g.ud)) {
      out.set(g.group, `${g.ud.replace(/순환$/, '')}순환`);
      continue;
    }
    const byOrder = towardByOrder(g.line, station, g.dir);
    if (byOrder) {
      out.set(g.group, byOrder);
      continue;
    }
    const sets = DIRSETS[g.line];
    if (sets) {
      const tos = g.tos.map(plain);
      const d = sets.find((x) => tos.some((t) => x.set.includes(t)));
      if (d) {
        out.set(g.group, d.label);
        continue;
      }
    }
    const ends = TERMINALS[g.line] ?? [];
    const hit = g.tos.map(plain).find((t) => ends.includes(t));
    if (hit) {
      out.set(g.group, hit);
      udTerm.set(`${g.line}|${g.ud}`, hit);
    }
  }
  for (const g of groups) {
    if (out.has(g.group)) continue;
    // 반대 방향이 A 로 정해졌고 노선 끝이 둘뿐이면 이쪽은 B
    const ends = TERMINALS[g.line] ?? [];
    const other = [...udTerm.entries()].find(([k]) => k.startsWith(`${g.line}|`) && k !== `${g.line}|${g.ud}`)?.[1];
    if (other && ends.length === 2) out.set(g.group, ends.find((e) => e !== other));
    else out.set(g.group, [...new Set(g.tos.map(plain))].slice(0, 2).join('·'));
  }
  return out;
}

// 서울 실시간 API 가 다루는 수도권 (대략) — 부산·대구에도 "시청역" 이 있어 서울 열차가 잘못 나오지 않게
const inCapital = (p) => p.lat > 36.9 && p.lat < 38.0 && p.lng > 126.4 && p.lng < 127.8;

function meters(a, b) {
  const R = 6371000;
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}


async function nearStations(env, at) {
  return remembered(env, `subway:st:v2:${at.lat.toFixed(4)},${at.lng.toFixed(4)}`, STATIONS_TTL, async () => {
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=SW8&x=${at.lng}&y=${at.lat}&radius=1000&sort=distance&size=15`,
        { headers: { Authorization: `KakaoAK ${env.KAKAO_REST_KEY}` } }
      );
      if (!res.ok) return null;
      const docs = (await res.json())?.documents ?? [];
      const groups = [];
      for (const d of docs) {
        // "시청역 1호선" → 역 이름 "시청", 노선 "1호선"
        const m = String(d.place_name).match(/^(.+?)역(?:\s+(.+))?$/);
        if (!m) continue;
        const name = m[1].trim();
        const line = (m[2] ?? '').trim();
        const pos = { lat: Number(d.y), lng: Number(d.x) };
        const same = groups.find((g) => g.name === name && meters(g.pos, pos) <= 400);
        if (same) {
          if (line && !same.lines.includes(line)) same.lines.push(line);
          same.dist = Math.min(same.dist, Number(d.distance) || same.dist);
        } else groups.push({ name, lines: line ? [line] : [], pos, dist: Number(d.distance) || meters(at, pos) });
      }
      // 노선은 숫자 차례로 (3호선 · 7호선 · 9호선)
      for (const g of groups) g.lines.sort((x, y) => (parseInt(x, 10) || 99) - (parseInt(y, 10) || 99) || x.localeCompare(y));
      return groups.sort((a, b) => a.dist - b.dist).slice(0, 2);
    } catch {
      return null;
    }
  });
}

/** "2분 후 (을지로입구)" · "[3]번째 전역 (종로3가)" · "전역 출발" · "당역 도착" → 몇 분 (모르면 null) */
function minutesOf(a) {
  const sec = Number(a.barvlDt);
  if (sec > 0) return Math.round(sec / 60);
  const msg = String(a.arvlMsg2 ?? '');
  // "전역 도착" 도 '도착' 으로 끝나 곧 도착(0분)으로 잘못 읽혔다 — 전역부터 본다
  if (/전역 (출발|도착|진입)/.test(msg)) return 2;
  if (/당역 도착|진입|도착$/.test(msg)) return 0;
  const m = msg.match(/(\d+)분/);
  if (m) return Number(m[1]);
  return null;
}

/**
 * 역 전광판처럼 — 노선·방향마다 이번 열차 · 다음 열차 두 대.
 *   group  같은 방향끼리 묶는 이름 (화면이 "교대 방면" 한 덩어리로 보여 준다)
 *   at     열차가 지금 있는 역 ("방배") · msg 는 서울시 안내 그대로("전역 출발" · "[3]번째 전역 (사당)")
 *   express 급행·ITX · last 막차 · no 열차 번호
 */
async function live(env, name) {
  return remembered(env, `subway:live:v7:${name}`, LIVE_TTL, async () => {
    try {
      const res = await fetch(
        `http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(env.SEOUL_SUBWAY_KEY)}/json/realtimeStationArrival/0/40/${encodeURIComponent(name)}`
      );
      if (!res.ok) return null;
      const list = (await res.json())?.realtimeArrivalList;
      if (!Array.isArray(list)) return [];
      const groups = new Map();
      for (const a of list) {
        const line = LINE[a.subwayId] ?? '';
        const [to, rawDir] = String(a.trainLineNm ?? '').split(' - ').map((x) => x.trim());
        const dir = String(rawDir || a.updnLine || '').replace(/\s*\((급행|특급|ITX)\)\s*/g, '').trim();
        const group = `${a.subwayId}|${a.updnLine}|${dir}`;
        const item = {
          group,
          ud: String(a.updnLine ?? ''),
          line,
          dir,
          to: to || '',
          min: minutesOf(a),
          msg: String(a.arvlMsg2 ?? ''),
          at: String(a.arvlMsg3 ?? '').replace(/역$/, ''),
          express: /급행|특급|ITX/.test(`${a.btrainSttus ?? ''} ${a.trainLineNm ?? ''}`),
          last: String(a.lstcarAt ?? '') === '1',
          no: String(a.btrainNo ?? ''),
        };
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(item);
      }
      // 머리말(종착역 방면)은 그 방향 열차 전부의 행선지로 정한다
      const toward = towardOf(
        [...groups.entries()].map(([group, tr]) => ({ group, line: tr[0].line, ud: tr[0].ud, dir: tr[0].dir, tos: tr.map((x) => x.to) })),
        name
      );
      const out = [];
      for (const [group, trains] of groups.entries()) {
        trains.sort((x, y) => (x.min ?? 999) - (y.min ?? 999));
        out.push(...trains.slice(0, 2).map(({ ud, ...x }) => ({ ...x, toward: toward.get(group) })));
      }
      // 노선 차례 → 방향 → 이번 열차가 빠른 방향 먼저
      const first = new Map();
      for (const t of out) if (!first.has(t.group)) first.set(t.group, t.min ?? 999);
      return out
        .sort((x, y) => x.line.localeCompare(y.line) || first.get(x.group) - first.get(y.group) || x.group.localeCompare(y.group) || (x.min ?? 999) - (y.min ?? 999))
        .slice(0, 16);
    } catch {
      return null;
    }
  });
}

/* ── 전국 시간표 (국토교통부 TAGO 지하철정보, DATA_GO_KR_KEY) ─────────────────────────
 * 실시간이 공개된 곳은 수도권뿐이라, 나머지는 시간표의 "다음 열차" 로 같은 모양("○분 후")을 만든다.
 * TAGO 는 서울·부산·대구·광주·대전 지하철과 코레일 전철(동해선 등)까지 다 있다.
 *   역 찾기  GetKwrdFndSubwaySttnList?subwayStationName=서면 → [{ subwayStationId: 'MTRBS10119', subwayRouteName: '1호선' }]
 *   시간표   GetSubwaySttnAcctoSchdulList?subwayStationId=…&dailyTypeCode=01|02|03&upDownTypeCode=U|D
 * 카카오 이름과 TAGO 이름이 조금 다르다("시청" ↔ "시청(연제)") — 이름 앞부분 + 노선 + 도시(역 ID 앞자리)로 맞춘다.
 */
const TAGO = 'https://apis.data.go.kr/1613000/SubwayInfo';
// 카카오 노선 이름 앞의 도시 → TAGO 역 ID 앞자리
const CITY_ID = { 부산: 'MTRBS', 대구: 'MTRDG', 대전: 'MTRDJ', 광주: 'MTRGJ' };
const CITY_IDS = Object.values(CITY_ID);

function taKey(env) {
  const k = String(env.DATA_GO_KR_KEY ?? '').trim();
  // Encoding 키(%2F …)는 그대로, Decoding 키는 인코딩해서
  return /%[0-9A-F]{2}/i.test(k) ? k : encodeURIComponent(k);
}

async function tagoItems(env, op, qs) {
  const res = await fetch(`${TAGO}/${op}?serviceKey=${taKey(env)}&_type=json&pageNo=1&${qs}`);
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const items = body?.response?.body?.items;
  if (!body?.response) return null;
  return items?.item ? [].concat(items.item) : [];
}

/** 카카오 노선 "부산1호선" · "동해선" · "2호선" → { city, route: "1호선" · "동해" · "2호선" } */
function splitLine(line) {
  const city = Object.keys(CITY_ID).find((c) => line.startsWith(c));
  let route = city ? line.slice(city.length) : line;
  if (!/호선$/.test(route)) route = route.replace(/선$/, '');
  return { city, route };
}

/** 이 역·노선들의 TAGO 역 ID (노선마다 하나). 30일 기억 */
async function tagoStations(env, name, lines) {
  return remembered(env, `subway:tago:v1:${name}|${lines.join(',')}`, STATIONS_TTL, async () => {
    const items = await tagoItems(env, 'GetKwrdFndSubwaySttnList', `numOfRows=50&subwayStationName=${encodeURIComponent(name)}`);
    if (items === null) return null;
    const sameName = items.filter((i) => {
      const n = String(i.subwayStationName ?? '');
      return n === name || n.startsWith(`${name}(`) || n.startsWith(`${name}.`);
    });
    const out = [];
    for (const line of lines) {
      const { city, route } = splitLine(line);
      const hit = sameName.find((i) => {
        const id = String(i.subwayStationId);
        const r = String(i.subwayRouteName ?? '').replace(/선$/, '');
        const routeOk = r === route || r === route.replace(/선$/, '');
        const cityOk = city ? id.startsWith(CITY_ID[city]) : !CITY_IDS.some((p) => id.startsWith(p));
        return routeOk && cityOk;
      });
      if (hit) out.push({ line, id: String(hit.subwayStationId) });
    }
    return out;
  });
}

/** 한국 시각 — { day: 01 평일 · 02 토 · 03 일, sec: 자정부터 초 } (공휴일은 평일 시간표로 둔다) */
function kstNow() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const wd = d.getUTCDay();
  return { day: wd === 6 ? '02' : wd === 0 ? '03' : '01', sec: d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds() };
}
const hmsSec = (t) => {
  const s = String(t ?? '').padStart(6, '0');
  return Number(s.slice(0, 2)) * 3600 + Number(s.slice(2, 4)) * 60 + Number(s.slice(4, 6));
};

/** 한 역·방향의 오늘 시간표 [{ sec, to }] — 하루 기억 */
async function timetable(env, id, day, ud) {
  return remembered(env, `subway:tt:v1:${id}|${day}|${ud}`, 24 * 3600, async () => {
    const items = await tagoItems(env, 'GetSubwaySttnAcctoSchdulList', `numOfRows=500&subwayStationId=${id}&dailyTypeCode=${day}&upDownTypeCode=${ud}`);
    if (items === null) return null;
    return items
      .map((i) => ({ sec: hmsSec(Number(i.depTime) > 0 ? i.depTime : i.arrTime), to: String(i.endSubwayStationNm ?? '') }))
      .filter((x) => x.sec > 0)
      .sort((a, b) => a.sec - b.sec);
  });
}

/** 시간표로 노선·방향마다 다음 열차 — live 와 같은 모양 */
async function scheduled(env, name, lines) {
  if (!env.DATA_GO_KR_KEY || !lines.length) return null;
  const ids = await tagoStations(env, name, lines);
  if (!ids?.length) return null;
  const { day, sec } = kstNow();
  const out = [];
  for (const { line, id } of ids) {
    for (const ud of ['U', 'D']) {
      const tt = await timetable(env, id, day, ud);
      // 자정 넘은 막차(25시처럼 적힌 것)도 있어 sec 그대로 비교 — 방향마다 이번·다음 두 대
      const next = (tt ?? []).filter((x) => x.sec >= sec).slice(0, 2);
      const lastSec = tt?.length ? tt[tt.length - 1].sec : -1;
      // 그 방향 하루 열차 중 가장 많이 가는 곳 = 종착역
      const count = new Map();
      for (const x of tt ?? []) if (x.to) count.set(x.to, (count.get(x.to) ?? 0) + 1);
      const toward = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      for (const n of next)
        out.push({
          group: `${id}|${ud}`,
          line,
          dir: '',
          to: n.to ? `${n.to}행` : '',
          min: Math.round((n.sec - sec) / 60),
          msg: '',
          toward: plain(toward),
          last: n.sec === lastSec,
        });
    }
  }
  return out.length ? out : [];
}

export async function subway(url, env, json) {
  if (!env.KAKAO_REST_KEY) return json({ error: '서버에 KAKAO_REST_KEY 가 설정되지 않았습니다' }, 500);
  const at = { lat: Number(url.searchParams.get('lat')), lng: Number(url.searchParams.get('lng')) };
  if (!Number.isFinite(at.lat) || !Number.isFinite(at.lng)) return json({ error: 'lat, lng 를 주세요' }, 400);

  const stations = await nearStations(env, at);
  if (stations === null) return json({ error: '역 정보를 받지 못했습니다' }, 502);
  const out = await Promise.all(
    stations.map(async (s) => {
      // 수도권은 실시간(키가 있을 때), 비었거나 실패하면 · 그 밖은 시간표
      if (env.SEOUL_SUBWAY_KEY && inCapital(s.pos)) {
        const l = await live(env, s.name);
        if (l?.length) return { name: s.name, lines: s.lines, dist: s.dist, live: l, kind: 'live' };
      }
      const sch = await scheduled(env, s.name, s.lines).catch(() => null);
      return { name: s.name, lines: s.lines, dist: s.dist, live: sch, kind: sch ? 'schedule' : null };
    })
  );
  return json({ stations: out, checkedAt: new Date().toISOString() });
}
