/**
 * 장소 검색 — 카카오 키워드 검색 (비밀 변수 KAKAO_REST_KEY).
 *
 *   GET /place?q=강남역
 *   → { places: [{ name, address, category, lat, lng }] }   (최대 8곳, 정확한 순)
 *
 * 내 주변 지도 검색창에서 "강남역" · "해운대" 같은 곳을 치면 지도를 그리로 옮기고 그 근처 도서관을
 * 가까운 순으로 보여 주는 데 쓴다. 우리 도서관 이름 검색은 앱 안에서 한다(여기 오지 않는다).
 * 같은 검색어는 7일 기억한다. 카카오 오류는 기억하지 않는다.
 */
const TTL = 7 * 24 * 3600;
const MEM = new Map();

export async function place(url, env, json) {
  if (!env.KAKAO_REST_KEY) return json({ error: '서버에 KAKAO_REST_KEY 가 설정되지 않았습니다' }, 500);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 50);
  if (q.length < 1) return json({ error: 'q 를 주세요' }, 400);

  const key = `place:v1:${q.toLowerCase()}`;
  const hit = MEM.get(key);
  if (hit && hit.until > Date.now()) return json(hit.value);
  try {
    const kv = env.LOAN_KV ? await env.LOAN_KV.get(key, 'json') : null;
    if (kv) {
      MEM.set(key, { until: Date.now() + 3600 * 1000, value: kv });
      return json(kv);
    }
  } catch {
    // 기억을 못 읽으면 카카오에 묻는다
  }

  let docs;
  try {
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?size=8&query=${encodeURIComponent(q)}`, {
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_KEY}` },
    });
    if (!res.ok) return json({ error: '카카오가 답하지 않습니다' }, 502);
    docs = (await res.json())?.documents ?? [];
  } catch {
    return json({ error: '카카오가 답하지 않습니다' }, 502);
  }

  const value = {
    places: docs
      .map((d) => ({
        name: d.place_name,
        address: d.road_address_name || d.address_name || '',
        // "교통,수송 > 지하철,전철 > 수도권2호선" → 마지막 칸만
        category: String(d.category_name ?? '').split('>').pop().trim(),
        lat: Number(d.y),
        lng: Number(d.x),
      }))
      .filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng)),
  };

  MEM.set(key, { until: Date.now() + 3600 * 1000, value });
  if (env.LOAN_KV) {
    try {
      await env.LOAN_KV.put(key, JSON.stringify(value), { expirationTtl: TTL });
    } catch {
      // 쓰기 한도 등
    }
  }
  return json(value);
}
