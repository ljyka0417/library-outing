/**
 * 책 소개 — 카카오 책 검색 (비밀 변수 KAKAO_REST_KEY).
 *
 *   GET /book?isbn=9788936434120
 *   → { isbn, title, authors, translators, publisher, year, contents, thumbnail, url }
 *     · 찾지 못하면 { isbn, found: false }
 *
 * "어디서 빌릴 수 있나요?" 판에 줄거리·출판사·출간 연도를 붙이는 데 쓴다. 정보나루 하루 한도와 상관없다.
 * contents 는 카카오가 주는 소개 글 앞부분(250자쯤)이다 — 화면에 "책 정보: 카카오" 를 함께 적는다.
 * 같은 책은 30일 기억한다(없는 책은 3일). 카카오 오류는 기억하지 않는다.
 */
const TTL_FOUND = 30 * 24 * 3600;
const TTL_MISSING = 3 * 24 * 3600;
const MEM = new Map();

export async function book(url, env, json) {
  if (!env.KAKAO_REST_KEY) return json({ error: '서버에 KAKAO_REST_KEY 가 설정되지 않았습니다' }, 500);
  const isbn = (url.searchParams.get('isbn') ?? '').replace(/[^0-9X]/gi, '');
  if (!/^(\d{9}[\dX]|\d{13})$/i.test(isbn)) return json({ error: 'isbn 은 10자리 또는 13자리 숫자로 주세요' }, 400);

  const key = `book:v1:${isbn}`;
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

  let doc;
  try {
    const res = await fetch(`https://dapi.kakao.com/v3/search/book?target=isbn&size=1&query=${isbn}`, {
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_KEY}` },
    });
    if (!res.ok) return json({ error: '카카오가 답하지 않습니다' }, 502);
    doc = (await res.json())?.documents?.[0];
  } catch {
    return json({ error: '카카오가 답하지 않습니다' }, 502);
  }

  const value = doc
    ? {
        isbn,
        title: doc.title,
        authors: doc.authors ?? [],
        translators: doc.translators ?? [],
        publisher: doc.publisher || undefined,
        year: doc.datetime ? doc.datetime.slice(0, 4) : undefined,
        // 카카오 소개 글은 문장 중간에서 끊겨 온다 — 화면이 "…" 를 붙인다
        contents: (doc.contents || '').trim() || undefined,
        thumbnail: doc.thumbnail || undefined,
        url: doc.url || undefined,
      }
    : { isbn, found: false };

  MEM.set(key, { until: Date.now() + 3600 * 1000, value });
  if (env.LOAN_KV) {
    try {
      await env.LOAN_KV.put(key, JSON.stringify(value), { expirationTtl: doc ? TTL_FOUND : TTL_MISSING });
    } catch {
      // 쓰기 한도 등 — 답에는 영향 없다
    }
  }
  return json(value);
}
