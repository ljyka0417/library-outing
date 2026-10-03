/**
 * 지금 날씨 — 기상청 초단기실황·초단기예보 (공공데이터포털, 비밀 변수 DATA_GO_KR_KEY).
 *
 *   GET /weather?lat=37.5663&lng=126.9779
 *   → { condition: 'clear'|'partly'|'cloudy'|'rain'|'sleet'|'snow',
 *       temp, rain1h, humidity, wind, observedAt, grid: [nx, ny] }
 *
 * 기상청은 위경도가 아니라 5km 격자(nx, ny)로 묻는다. 아래 변환식은 기상청이 공개한
 * 람베르트 정각원추도법 공식 그대로다.
 * 실황(지금 기온·비)에는 하늘 상태가 없어서, 다음 한 시간 초단기예보의 하늘 상태(SKY)를 붙인다.
 * 같은 격자는 10분 동안 기억한다 — 기상청 갱신 주기보다 짧고, 하루 1만 건 한도를 아낀다.
 */

const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136;

export function toGrid(lat, lng) {
  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD, olon = OLON * DEGRAD, olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  return [Math.floor(ra * Math.sin(theta) + XO + 0.5), Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)];
}

/** 한국 시각 (서버는 UTC 로 돈다) */
function kstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

/** 실황은 매시 정각 자료가 40분 뒤에 나온다. 예보는 매시 30분 자료가 45분 뒤에 나온다 */
function baseTimes() {
  const now = kstNow();
  const ncst = new Date(now.getTime() - (now.getUTCMinutes() < 40 ? 60 : 0) * 60000);
  const fcst = new Date(now.getTime() - (now.getUTCMinutes() < 45 ? 60 : 0) * 60000);
  return {
    ncst: { date: ymd(ncst), time: `${pad(ncst.getUTCHours())}00` },
    fcst: { date: ymd(fcst), time: `${pad(fcst.getUTCHours())}30` },
  };
}

const MEM = new Map();
const TTL = 10 * 60 * 1000;

async function kma(env, op, base, nx, ny) {
  const key = /%[0-9A-Fa-f]{2}/.test(env.DATA_GO_KR_KEY) ? env.DATA_GO_KR_KEY : encodeURIComponent(env.DATA_GO_KR_KEY);
  const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/${op}?serviceKey=${key}` +
    `&numOfRows=60&pageNo=1&dataType=JSON&base_date=${base.date}&base_time=${base.time}&nx=${nx}&ny=${ny}`;
  const res = await fetch(url);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error('기상청 응답을 읽을 수 없습니다'); }
  const code = body?.response?.header?.resultCode;
  if (code !== '00') throw new Error(body?.response?.header?.resultMsg ?? body?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ?? '기상청 오류');
  let items = body.response.body?.items?.item ?? [];
  if (!Array.isArray(items)) items = [items];
  return items;
}

export async function weather(url, env, json) {
  if (!env.DATA_GO_KR_KEY) return json({ error: '서버에 DATA_GO_KR_KEY 가 설정되지 않았습니다' }, 500);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  // 우리나라 안쪽만 받는다
  if (!(lat > 32 && lat < 39.5 && lng > 124 && lng < 132)) return json({ error: '위도·경도를 확인해 주세요' }, 400);

  const [nx, ny] = toGrid(lat, lng);
  const memKey = `${nx},${ny}`;
  const hit = MEM.get(memKey);
  if (hit && Date.now() - hit.at < TTL) return json(hit.value, 200, { 'Cache-Control': 'no-store' });

  try {
    const base = baseTimes();
    const [ncst, fcst] = await Promise.all([
      kma(env, 'getUltraSrtNcst', base.ncst, nx, ny),
      kma(env, 'getUltraSrtFcst', base.fcst, nx, ny),
    ]);
    const obs = Object.fromEntries(ncst.map((i) => [i.category, i.obsrValue]));
    // 예보 중 가장 이른 시각의 하늘 상태
    const sky = fcst.filter((i) => i.category === 'SKY').sort((a, b) => `${a.fcstDate}${a.fcstTime}`.localeCompare(`${b.fcstDate}${b.fcstTime}`))[0]?.fcstValue;

    const pty = Number(obs.PTY ?? 0);
    const condition =
      pty === 1 || pty === 5 ? 'rain'
        : pty === 2 || pty === 6 ? 'sleet'
          : pty === 3 || pty === 7 ? 'snow'
            : sky === '4' ? 'cloudy'
              : sky === '3' ? 'partly'
                : 'clear';
    const num = (v) => (v === undefined || v === null || Number.isNaN(Number(v)) ? undefined : Number(v));
    const value = {
      condition,
      temp: num(obs.T1H),
      rain1h: obs.RN1 === '강수없음' ? 0 : num(String(obs.RN1 ?? '').replace(/mm.*/, '')),
      humidity: num(obs.REH),
      wind: num(obs.WSD),
      observedAt: `${base.ncst.date.slice(0, 4)}-${base.ncst.date.slice(4, 6)}-${base.ncst.date.slice(6)}T${base.ncst.time.slice(0, 2)}:00+09:00`,
      grid: [nx, ny],
    };
    if (MEM.size > 2000) MEM.delete(MEM.keys().next().value);
    MEM.set(memKey, { at: Date.now(), value });
    return json(value, 200, { 'Cache-Control': 'no-store' });
  } catch (e) {
    return json({ error: String(e.message ?? e) }, 503);
  }
}
