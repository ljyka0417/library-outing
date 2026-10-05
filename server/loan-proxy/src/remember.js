/**
 * 한 번 받은 답을 기억해 두었다가 다시 쓴다 — 버스·지하철처럼 같은 걸 자주 묻는 곳이 함께 쓴다.
 *
 *   오래 두는 것(6시간 이상 — 정류장·역 목록·시간표)  →  Workers KV (어느 지역에서 와도 같은 답)
 *   잠깐 두는 것(실시간 도착 1분 …)                    →  Cache API (지역마다 따로, 쓰기 한도 없음)
 *
 * ⚠️ 무료 KV 는 쓰기가 하루 1,000번이다. 실시간 도착을 1분마다 KV 에 쓰면 정류장 몇 곳만으로 금방 넘고,
 *    그러면 역 목록·책 정보 같은 다른 기억도 그날은 못 쓴다. 그래서 짧은 것은 Cache API 에 둔다.
 * 오류(null)는 기억하지 않는다. 기억을 못 읽거나 못 써도 답에는 영향이 없다.
 */
const MEM = new Map();
const LONG = 6 * 3600;

const cacheReq = (key) => new Request(`https://remember.internal/${encodeURIComponent(key)}`);

export async function remembered(env, key, ttl, make) {
  const hit = MEM.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const long = ttl >= LONG && env.LOAN_KV;
  const cache = !long && typeof caches !== 'undefined' ? caches.default : null;
  try {
    const kept = long ? await env.LOAN_KV.get(key, 'json') : cache ? await (await cache.match(cacheReq(key)))?.json() : null;
    if (kept) {
      MEM.set(key, { until: Date.now() + Math.min(ttl, 3600) * 1000, value: kept });
      return kept;
    }
  } catch {
    // 기억을 못 읽으면 새로 묻는다
  }
  const value = await make();
  if (value === null) return null;
  MEM.set(key, { until: Date.now() + Math.min(ttl, 3600) * 1000, value });
  try {
    if (long) await env.LOAN_KV.put(key, JSON.stringify(value), { expirationTtl: ttl });
    else if (cache)
      await cache.put(
        cacheReq(key),
        new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${ttl}` } })
      );
  } catch {
    // 쓰기 한도 등
  }
  return value;
}
