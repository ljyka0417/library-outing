/**
 * 라키브 — 대출 가능 여부 중계 서버 (Cloudflare Workers)
 *
 * 왜 필요한가
 *   "이 책 지금 빌릴 수 있나"는 실시간 정보라 볼 때마다 도서관 정보나루에 물어야 한다.
 *   그런데 정보나루 키를 앱에 넣으면 누구나 앱 파일을 열어 키를 꺼낼 수 있다.
 *   그래서 키는 이 중계 서버에만 두고(Cloudflare 비밀 변수 DATA4LIBRARY_KEY),
 *   앱은 "이 도서관에 이 책들 있어?"만 묻는다.
 *
 *   GET /loan?lib=111314&isbn=9788936434120,9788954646079
 *   → { lib, checkedAt, results: { "9788936434120": { hasBook: true, loanAvailable: true }, ... } }
 *     정보나루가 답하지 않은 책은 null.
 *
 * 지키는 것
 *   - 앱에 실린 도서관만 받는다 (libs.js). 남이 우리 키로 정보나루를 마구 부르지 못하게.
 *   - 한 번에 책 10권까지, ISBN 은 숫자 13자리만.
 *   - 같은 질문은 10분 동안 기억해 둔다. 정보나루 하루 호출 한도를 아끼고 더 빨리 답한다.
 *     대출 상태가 10분 사이에 바뀔 수는 있어서, 앱은 "방금 확인" 이라고만 말한다.
 */
import LIBS from './libs.js';

const ALLOWED = new Set(LIBS);
const MAX_BOOKS = 10;
const CACHE_SECONDS = 600;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });

/** 정보나루에 한 권 묻기. 실패하면 null (지어내지 않는다) */
async function askOne(env, lib, isbn) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`https://loan-cache.internal/${lib}/${isbn}`);
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit.json();
  }
  const url =
    `https://data4library.kr/api/bookExist?authKey=${encodeURIComponent(env.DATA4LIBRARY_KEY)}` +
    `&libCode=${lib}&isbn13=${isbn}&format=json`;
  try {
    // Accept 헤더를 붙이면 정보나루가 406 을 돌려준다 (format=json 으로 충분하다)
    const res = await fetch(url);
    if (!res.ok) return null;
    const result = (await res.json())?.response?.result;
    if (!result || (result.hasBook !== 'Y' && result.hasBook !== 'N')) return null;
    const value = { hasBook: result.hasBook === 'Y', loanAvailable: result.loanAvailable === 'Y' };
    if (cache) {
      await cache.put(
        cacheKey,
        new Response(JSON.stringify(value), { headers: { 'Cache-Control': `max-age=${CACHE_SECONDS}` } })
      );
    }
    return value;
  } catch {
    return null;
  }
}

export async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'GET') return json({ error: 'GET 만 받습니다' }, 405);

  const url = new URL(request.url);
  if (url.pathname !== '/loan') return json({ error: '없는 주소입니다. /loan?lib=…&isbn=… 로 물어 주세요' }, 404);
  if (!env.DATA4LIBRARY_KEY) return json({ error: '서버에 DATA4LIBRARY_KEY 가 설정되지 않았습니다' }, 500);

  const lib = url.searchParams.get('lib') ?? '';
  if (!ALLOWED.has(lib)) return json({ error: '이 앱에 실린 도서관이 아닙니다' }, 400);

  const isbns = [...new Set((url.searchParams.get('isbn') ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (isbns.length === 0 || isbns.length > MAX_BOOKS || isbns.some((s) => !/^\d{13}$/.test(s))) {
    return json({ error: `ISBN(숫자 13자리)을 1~${MAX_BOOKS}개 쉼표로 이어 주세요` }, 400);
  }

  const answers = await Promise.all(isbns.map((isbn) => askOne(env, lib, isbn)));
  const results = Object.fromEntries(isbns.map((isbn, i) => [isbn, answers[i]]));
  return json({ lib, checkedAt: new Date().toISOString(), results }, 200, { 'Cache-Control': 'no-store' });
}

export default { fetch: handle };
