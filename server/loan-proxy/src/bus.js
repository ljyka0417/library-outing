/**
 * 도서관 근처 버스 — 국토교통부 TAGO 버스정류소정보 + 버스도착정보, 서울은 서울특별시 정류소정보조회
 * (모두 공공데이터포털 DATA_GO_KR_KEY).
 *
 *   GET /bus?lat=35.8714&lng=128.6014
 *   → { stops: [{ name, no, dist, arrivals: [{ route, min, prev, type }] }], checkedAt }
 *     · 근처 정류장이 없으면 stops: [] (TAGO 에 없는 서울은 서울시 API 로 대신 묻는다)
 *
 * 정류장: 반경 500m 안에서 가까운 두 곳. 같은 자리의 정류장이 시 코드만 달리 두 번 나오면
 *   (대구 시내버스 22 · 경산 버스 37100 이 같이 서는 정류장) 한 곳으로 합치고 양쪽 버스를 다 묻는다.
 *   좌표마다 30일 기억한다 — 정류장은 거의 안 바뀐다.
 * 도착: 1분 기억한다 (KV 의 가장 짧은 보관 시간). 그 사이엔 같은 답을 준다.
 * 하루 한도는 기능마다 1만 건이다.
 */
import { remembered } from './remember.js';
const BASE = 'https://apis.data.go.kr/1613000';
const STOPS_TTL = 30 * 24 * 3600;
const ARRIVAL_TTL = 60;

const keyOf = (env) => (/%/.test(env.DATA_GO_KR_KEY) ? env.DATA_GO_KR_KEY : encodeURIComponent(env.DATA_GO_KR_KEY));
const list = (x) => (x ? (Array.isArray(x) ? x : [x]) : []);

function meters(a, b) {
  const R = 6371000;
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}


/** 근처 정류장 (같은 자리는 하나로, 시 코드·정류장 ID 는 묶어서) */
async function nearStops(env, at) {
  const key = `bus:stops:v2:${at.lat.toFixed(4)},${at.lng.toFixed(4)}`;
  return remembered(env, key, STOPS_TTL, async () => {
    try {
      const res = await fetch(
        `${BASE}/BusSttnInfoInqireService/getCrdntPrxmtSttnList?serviceKey=${keyOf(env)}&gpsLati=${at.lat}&gpsLong=${at.lng}&numOfRows=30&_type=json`
      );
      if (!res.ok) return null;
      const items = list((await res.json())?.response?.body?.items?.item);
      const groups = [];
      for (const it of items) {
        const pos = { lat: Number(it.gpslati), lng: Number(it.gpslong) };
        if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng) || !it.nodeid) continue;
        // 15m 안이면 같은 정류장 — 이름이 달라도 (경산 버스 자료는 대구 정류장을 옛 이름으로 적는다).
        // 길 건너편 정류장은 보통 20~30m 떨어져 있어 따로 남는다.
        // 이름은 광역시 시내버스 쪽(시 코드 두 자리: 대구 22, 부산 21 …)을 쓴다 — 그 도시가 붙인 지금 이름이다.
        const city = String(it.citycode);
        const same = groups.find((g) => meters(g.pos, pos) <= 15);
        if (same) {
          same.ids.push({ city, node: it.nodeid });
          if (city.length <= 2 && same.city.length > 2) {
            same.name = it.nodenm;
            same.city = city;
            if (it.nodeno) same.no = String(it.nodeno);
          }
        } else groups.push({ name: it.nodenm, city, no: it.nodeno ? String(it.nodeno) : undefined, pos, ids: [{ city, node: it.nodeid }] });
      }
      if (groups.length) {
        return groups
          .map((g) => ({ ...g, dist: meters(at, g.pos) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);
      }
      // TAGO 에 없는 곳(서울) — 서울시 정류소정보조회로
      return seoulStops(env, at);
    } catch {
      return null;
    }
  });
}

/**
 * 서울 — 서울특별시_정류소정보조회 (ws.bus.go.kr, 같은 공공데이터포털 키).
 * TAGO 에 서울 시내버스가 없어서 따로 묻는다. 정류장마다 ARS 번호(arsId)로 도착을 묻는다.
 */
const SEOUL = 'http://ws.bus.go.kr/api/rest';
async function seoulStops(env, at) {
  const res = await fetch(`${SEOUL}/stationinfo/getStationByPos?serviceKey=${keyOf(env)}&tmX=${at.lng}&tmY=${at.lat}&radius=500&resultType=json`);
  if (!res.ok) return null;
  const items = list((await res.json())?.msgBody?.itemList);
  return items
    .filter((s) => s.arsId && s.arsId !== '0')
    .map((s) => ({
      name: s.stationNm,
      no: s.arsId,
      pos: { lat: Number(s.gpsY), lng: Number(s.gpsX) },
      dist: Number(s.dist) || meters(at, { lat: Number(s.gpsY), lng: Number(s.gpsX) }),
      ids: [{ city: 'seoul', node: s.arsId }],
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2);
}

/** "3분12초후[2번째 전]" · "곧 도착" · "운행종료" → { min, prev } 또는 null(안 오는 버스) */
function seoulMsg(msg) {
  const m = String(msg ?? '').trim();
  if (!m || /운행종료|출발대기|회차대기|정보없음/.test(m)) return null;
  if (/곧 도착/.test(m)) return { min: 0, prev: 0 };
  const min = m.match(/(\d+)분/);
  const sec = m.match(/(\d+)초/);
  const prev = m.match(/\[(\d+)번째 전\]/);
  if (!min && !sec) return null;
  return { min: Math.round((Number(min?.[1] ?? 0) * 60 + Number(sec?.[1] ?? 0)) / 60), prev: Number(prev?.[1] ?? 0) };
}

async function seoulArrivals(env, ars) {
  const res = await fetch(`${SEOUL}/stationinfo/getStationByUid?serviceKey=${keyOf(env)}&arsId=${ars}&resultType=json`);
  if (!res.ok) return null;
  const out = [];
  for (const r of list((await res.json())?.msgBody?.itemList)) {
    const first = seoulMsg(r.arrmsg1);
    if (!first || !r.rtNm) continue;
    out.push({ route: String(r.rtNm), min: first.min, prev: first.prev, type: r.busType1 === '1' ? '저상버스' : undefined });
  }
  return out;
}

async function arrivals(env, city, node) {
  return remembered(env, `bus:arr:v1:${city}:${node}`, ARRIVAL_TTL, async () => {
    try {
      if (city === 'seoul') return await seoulArrivals(env, node);
      const res = await fetch(
        `${BASE}/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList?serviceKey=${keyOf(env)}&cityCode=${city}&nodeId=${node}&numOfRows=30&_type=json`
      );
      if (!res.ok) return null;
      return list((await res.json())?.response?.body?.items?.item).map((a) => ({
        route: String(a.routeno ?? ''),
        min: Math.max(0, Math.round(Number(a.arrtime) / 60)),
        prev: Number(a.arrprevstationcnt) || 0,
        type: a.vehicletp || undefined,
      }));
    } catch {
      return null;
    }
  });
}

export async function bus(url, env, json) {
  if (!env.DATA_GO_KR_KEY) return json({ error: '서버에 DATA_GO_KR_KEY 가 설정되지 않았습니다' }, 500);
  const at = { lat: Number(url.searchParams.get('lat')), lng: Number(url.searchParams.get('lng')) };
  if (!Number.isFinite(at.lat) || !Number.isFinite(at.lng)) return json({ error: 'lat, lng 를 주세요' }, 400);

  const stops = await nearStops(env, at);
  if (stops === null) return json({ error: '정류장 정보를 받지 못했습니다' }, 502);

  const out = [];
  for (const s of stops) {
    const lists = await Promise.all(s.ids.slice(0, 2).map((id) => arrivals(env, id.city, id.node)));
    const merged = lists.filter(Boolean).flat();
    // 같은 노선이 두 번(양쪽 시 코드) 오면 먼저 오는 것만
    const byRoute = new Map();
    for (const a of merged) {
      const prev = byRoute.get(a.route);
      if (!prev || a.min < prev.min) byRoute.set(a.route, a);
    }
    out.push({
      name: s.name,
      no: s.no,
      dist: s.dist,
      // 도착 정보를 하나도 못 받았으면 null — "도착 예정 없음"과 구분한다
      arrivals: lists.every((l) => l === null) ? null : [...byRoute.values()].sort((a, b) => a.min - b.min).slice(0, 6),
    });
  }
  // 화면이 출처를 적는다 — 서울은 서울시, 나머지는 국토교통부 TAGO
  const source = stops[0]?.ids?.[0]?.city === 'seoul' ? 'seoul' : 'tago';
  return json({ stops: out, source, checkedAt: new Date().toISOString() });
}
