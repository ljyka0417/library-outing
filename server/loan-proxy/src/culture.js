/**
 * 도서관 근처 문화 행사 — 한국문화정보원 「한눈에보는문화정보」(공공데이터포털, 비밀 변수 DATA_GO_KR_KEY).
 *
 *   GET /culture?lat=37.5663&lng=126.9779[&r=1500]
 *   → { events: [{ seq, title, kind: 'show'|'exhibit'|'other', realm, start, end, place, thumb, lat, lng, dist }] }
 *     오늘 열려 있거나 두 달 안에 시작하는 공연·전시 중 반경 r 미터(기본 1.5km, 최대 3km) 안, 가까운 순 10개(같은 곳은 두 개까지).
 *
 *   GET /culture/detail?seq=393376
 *   → { price, url, phone, placeAddr, placeUrl }  (원문 그대로, 없는 칸은 빠진다)
 *
 * 기간 목록(period2)은 위치로 걸러 묻는 기능이 없어서, 전국 목록(천 건 안팎, 한 번에 받힌다)을
 * 받아 두고 서버에서 거리로 거른다. 목록은 6시간, 상세는 하루 동안 기억한다.
 * 응답은 XML 이라 필요한 칸만 꺼낸다.
 */

const BASE = 'https://apis.data.go.kr/B553457/cultureinfo';
const LIST_TTL = 6 * 3600 * 1000;
const DETAIL_TTL = 24 * 3600 * 1000;
const MAX_RADIUS = 3000;
const LIMIT = 10;
const PER_PLACE = 2;

let LIST = null; // { day, at, items }
const DETAIL = new Map();

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
/** 한국 날짜 (서버는 UTC 로 돈다) */
const kstDay = (plusDays = 0) => ymd(new Date(Date.now() + 9 * 3600 * 1000 + plusDays * 86400 * 1000));
const dashed = (s) => (/^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : undefined);

/** 원문이 두 번 이스케이프된 곳이 있다 ("&amp;lt;돌쇠전&amp;gt;") — 한 번 풀어서 또 바뀌면 한 번 더 */
function decode(s) {
  const once = (v) => v
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
  const raw = s.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1');
  const one = once(raw);
  return (one === raw ? one : once(one)).trim();
}
function tag(x, t) {
  const i = x.indexOf(`<${t}>`);
  const j = x.indexOf(`</${t}>`);
  return i < 0 || j < 0 ? '' : decode(x.slice(i + t.length + 2, j));
}
const items = (xml) => xml.split('<item>').slice(1);
/** 이미지 주소는 https 로 (iOS 는 http 그림을 막는다. culture.go.kr 은 https 도 된다) */
const https = (u) => (u ? u.replace(/^http:\/\//, 'https://') : undefined);

function serviceKey(env) {
  return /%[0-9A-Fa-f]{2}/.test(env.DATA_GO_KR_KEY) ? env.DATA_GO_KR_KEY : encodeURIComponent(env.DATA_GO_KR_KEY);
}

async function call(env, op, query) {
  const res = await fetch(`${BASE}/${op}?serviceKey=${serviceKey(env)}&${query}`);
  const text = await res.text();
  if (tag(text, 'resultCode') !== '00') throw new Error(tag(text, 'resultMsg') || tag(text, 'returnAuthMsg') || `문화정보 오류 ${res.status}`);
  return text;
}

async function allEvents(env) {
  const today = kstDay();
  if (LIST && LIST.day === today && Date.now() - LIST.at < LIST_TTL) return LIST.items;
  // from·to 로 거르는 기준이 들쭉날쭉하다 (12월 말에 끝나는 전시가 to=12-02 에서는 빠졌다).
  // 그래서 한 해를 넉넉히 받고, 열려 있는지는 아래에서 날짜로 직접 거른다.
  const xml = await call(env, 'period2', `PageNo=1&numOfrows=5000&from=${today}&to=${kstDay(365)}`);
  const soon = kstDay(60);
  const list = items(xml)
    .map((x) => {
      const service = tag(x, 'serviceName');
      return {
        seq: tag(x, 'seq'),
        title: tag(x, 'title'),
        // 갈래(realmName)가 더 자세하다 — 「공연」으로 올라온 미술관 전시도 갈래는 「전시」다
        kind: tag(x, 'realmName') === '전시' || service === '전시' ? 'exhibit' : service === '공연' ? 'show' : 'other',
        realm: tag(x, 'realmName') || undefined,
        start: dashed(tag(x, 'startDate')),
        end: dashed(tag(x, 'endDate')),
        endKey: tag(x, 'endDate'),
        startKey: tag(x, 'startDate'),
        place: tag(x, 'place') || undefined,
        thumb: https(tag(x, 'thumbnail')),
        lat: Number(tag(x, 'gpsY')),
        lng: Number(tag(x, 'gpsX')),
      };
    })
    // 좌표가 없거나, 이미 끝났거나, 두 달 뒤에야 시작하는 행사는 뺀다
    .filter((e) => e.seq && e.title && e.lat > 32 && e.lat < 39.5 && e.lng > 124 && e.lng < 132 && (!e.endKey || e.endKey >= today) && (!e.startKey || e.startKey <= soon));
  LIST = { day: today, at: Date.now(), items: list };
  return list;
}

function dist(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.round(Math.hypot(x, y) * R);
}

export async function culture(url, env, json) {
  if (!env.DATA_GO_KR_KEY) return json({ error: '서버에 DATA_GO_KR_KEY 가 설정되지 않았습니다' }, 500);
  try {
    if (url.pathname === '/culture/detail') return await detail(url, env, json);
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    if (!(lat > 32 && lat < 39.5 && lng > 124 && lng < 132)) return json({ error: '위도·경도를 확인해 주세요' }, 400);
    const r = Math.min(MAX_RADIUS, Math.max(100, Number(url.searchParams.get('r')) || 1500));

    const here = { lat, lng };
    const seen = new Map();
    const events = (await allEvents(env))
      .map((e) => ({ e, d: dist(here, e) }))
      .filter((x) => x.d <= r)
      .sort((a, b) => a.d - b.d)
      // 한 공연장이 목록을 다 차지하지 않게, 같은 곳(좌표가 같은 곳)은 두 개까지
      .filter((x) => {
        const k = `${x.e.lat},${x.e.lng}`;
        seen.set(k, (seen.get(k) ?? 0) + 1);
        return seen.get(k) <= PER_PLACE;
      })
      .slice(0, LIMIT)
      .map(({ e, d }) => ({
        seq: e.seq, title: e.title, kind: e.kind, realm: e.realm,
        start: e.start, end: e.end, place: e.place, thumb: e.thumb, lat: e.lat, lng: e.lng, dist: d,
      }));
    return json({ radius: r, events }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) {
    return json({ error: String(e.message ?? e) }, 503);
  }
}

async function detail(url, env, json) {
  const seq = url.searchParams.get('seq') ?? '';
  if (!/^\d{1,10}$/.test(seq)) return json({ error: '행사 번호(seq)를 확인해 주세요' }, 400);
  const hit = DETAIL.get(seq);
  if (hit && Date.now() - hit.at < DETAIL_TTL) return json(hit.value, 200, { 'Cache-Control': 'no-store' });

  const x = items(await call(env, 'detail2', `seq=${seq}`))[0];
  if (!x) return json({ error: '없는 행사입니다' }, 404);
  const pick = (t) => tag(x, t) || undefined;
  const link = (u) => (u && /^https?:\/\//.test(u) ? u : undefined);
  const value = {
    price: pick('price'),
    url: link(pick('url')),
    phone: pick('phone'),
    placeAddr: pick('placeAddr'),
    placeUrl: link(pick('placeUrl')),
  };
  if (DETAIL.size > 2000) DETAIL.delete(DETAIL.keys().next().value);
  DETAIL.set(seq, { at: Date.now(), value });
  return json(value, 200, { 'Cache-Control': 'no-store' });
}
