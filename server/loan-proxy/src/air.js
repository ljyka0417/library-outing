/**
 * 지금 미세먼지 — 한국환경공단 에어코리아 (공공데이터포털, 비밀 변수 DATA_GO_KR_KEY).
 *
 *   GET /air?lat=37.5663&lng=126.9779
 *   → { station, distance, dataTime, pm10, pm25, pm10Grade, pm25Grade, grade }
 *     grade 는 1 좋음 · 2 보통 · 3 나쁨 · 4 매우나쁨 (미세먼지·초미세먼지 중 나쁜 쪽)
 *
 * 전국 측정소의 지금 값을 한 번에 받아(sidoName=전국, 600여 곳) 30분 동안 기억하고,
 * 묻는 자리에서 가장 가까운 측정소를 고른다. 측정소 위치는 air-stations.js (npm run collect-air-stations).
 * 그래서 사용자가 몇 명이든 에어코리아에는 30분에 한 번 정도만 묻는다.
 * 가장 가까운 측정소가 점검 중이면(값 없음) 15km 안의 다음 측정소를 쓴다. 그래도 없으면 모른다고 한다.
 */
import STATIONS from './air-stations.js';

const TTL = 30 * 60 * 1000;
// 시골 도서관 세 곳(구룡포·산청지리산·갈대숲)은 가장 가까운 측정소가 12~15km 다. 앱이 측정소 이름을 함께 보여 준다
const MAX_KM = 15;
let LIST = null; // { at, byName }

function dist(a, b) {
  const R = 6371, r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.hypot(x, y) * R;
}

const num = (v) => (v === undefined || v === null || v === '' || v === '-' || Number.isNaN(Number(v)) ? undefined : Number(v));
/** 1시간 등급이 있으면 그것(지금 상태에 가깝다), 없으면 24시간 등급 */
const grade = (g1h, g) => num(g1h) ?? num(g);

async function nationwide(env) {
  if (LIST && Date.now() - LIST.at < TTL) return LIST.byName;
  // 서버가 새로 떴으면 다른 서버가 받아 둔 것을 KV 에서 먼저 찾는다
  if (env.LOAN_KV) {
    try {
      const hit = await env.LOAN_KV.get('air:v1', 'json');
      if (hit && Date.now() - hit.at < TTL) {
        LIST = { at: hit.at, byName: new Map(hit.rows) };
        return LIST.byName;
      }
    } catch {
      // KV 를 못 읽으면 에어코리아에 묻는다
    }
  }
  const key = /%[0-9A-Fa-f]{2}/.test(env.DATA_GO_KR_KEY) ? env.DATA_GO_KR_KEY : encodeURIComponent(env.DATA_GO_KR_KEY);
  // 에어코리아는 가끔 "서비스 연결실패"(SERVICETIMEOUT)를 준다 — 한 번 더 묻는다
  let items;
  let reason = '';
  for (let attempt = 0; attempt < 2 && !Array.isArray(items); attempt++) {
    const res = await fetch(
      `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${key}` +
        `&returnType=json&numOfRows=1000&pageNo=1&sidoName=${encodeURIComponent('전국')}&ver=1.3`
    );
    const text = await res.text();
    try {
      items = JSON.parse(text)?.response?.body?.items;
      if (!Array.isArray(items)) reason = JSON.parse(text)?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg ?? '측정값 없음';
    } catch {
      reason = `${res.status} ${text.slice(0, 80).replace(/\s+/g, ' ')}`;
    }
  }
  if (!Array.isArray(items)) throw new Error(`에어코리아가 측정값을 주지 않았습니다 (${reason})`);
  const rows = items.map((x) => [x.stationName, {
    dataTime: x.dataTime,
    pm10: num(x.pm10Value),
    pm25: num(x.pm25Value),
    pm10Grade: grade(x.pm10Grade1h, x.pm10Grade),
    pm25Grade: grade(x.pm25Grade1h, x.pm25Grade),
  }]);
  const at = Date.now();
  LIST = { at, byName: new Map(rows) };
  if (env.LOAN_KV) {
    try {
      await env.LOAN_KV.put('air:v1', JSON.stringify({ at, rows }), { expirationTtl: 3600 });
    } catch {
      // 못 적어도 답은 준다
    }
  }
  return LIST.byName;
}

export async function air(url, env, json) {
  if (!env.DATA_GO_KR_KEY) return json({ error: '서버에 DATA_GO_KR_KEY 가 설정되지 않았습니다' }, 500);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (!(lat > 32 && lat < 39.5 && lng > 124 && lng < 132)) return json({ error: '위도·경도를 확인해 주세요' }, 400);

  try {
    const byName = await nationwide(env);
    const here = { lat, lng };
    const near = STATIONS
      .map(([name, , slat, slng]) => ({ name, km: dist(here, { lat: slat, lng: slng }) }))
      .filter((s) => s.km <= MAX_KM)
      .sort((a, b) => a.km - b.km);
    for (const s of near) {
      const v = byName.get(s.name);
      if (!v || (v.pm10Grade === undefined && v.pm25Grade === undefined)) continue;
      const g = Math.max(v.pm10Grade ?? 0, v.pm25Grade ?? 0);
      return json({ station: s.name, distance: Math.round(s.km * 10) / 10, ...v, grade: g }, 200, { 'Cache-Control': 'no-store' });
    }
    return json({ error: '가까운 측정소의 값이 없습니다' }, 404);
  } catch (e) {
    return json({ error: String(e.message ?? e) }, 503);
  }
}
