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
  if (!env.DATA4LIBRARY_KEY) return json({ error: '서버에 DATA4LIBRARY_KEY 가 설정되지 않았습니다' }, 500);
  if (url.pathname === '/where') return where(url, env);
  if (url.pathname === '/search') return search(url, env);
  if (url.pathname !== '/loan') return json({ error: '없는 주소입니다. /loan · /where · /search 로 물어 주세요' }, 404);

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

/**
 * 책 한 권을 여러 도서관에 묻는다 — "이 책 어디서 빌릴 수 있어?"
 *   GET /where?isbn=9788936434120,9788936473235&libs=111314,111071
 *   → { checkedAt, results: { "111314": { hasBook, loanAvailable }, ... } }
 *
 * isbn 은 같은 책의 판본 여러 개(최대 3개)를 줄 수 있다. 도서관마다 가진 판본이 달라서,
 * 어느 판본이든 있으면 "있음", 어느 판본이든 빌릴 수 있으면 "대출 가능"으로 합친다.
 * 앱은 한 지역의 도서관(많아야 11곳)만 묻는다. 그래도 넉넉히 20곳까지 받는다.
 */
const MAX_LIBS = 20;
const MAX_EDITIONS = 3;
async function where(url, env) {
  const isbns = [...new Set((url.searchParams.get('isbn') ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (isbns.length === 0 || isbns.length > MAX_EDITIONS || isbns.some((s) => !/^\d{13}$/.test(s))) {
    return json({ error: `ISBN(숫자 13자리)을 1~${MAX_EDITIONS}개 주세요` }, 400);
  }
  const libs = [...new Set((url.searchParams.get('libs') ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (libs.length === 0 || libs.length > MAX_LIBS) return json({ error: `도서관 코드를 1~${MAX_LIBS}개 쉼표로 이어 주세요` }, 400);
  if (libs.some((l) => !ALLOWED.has(l))) return json({ error: '이 앱에 실린 도서관이 아닌 코드가 있습니다' }, 400);

  const results = {};
  await Promise.all(libs.map(async (lib) => {
    const answers = (await Promise.all(isbns.map((isbn) => askOne(env, lib, isbn)))).filter(Boolean);
    results[lib] = answers.length
      ? { hasBook: answers.some((a) => a.hasBook), loanAvailable: answers.some((a) => a.hasBook && a.loanAvailable) }
      : null;
  }));
  return json({ isbn: isbns.join(','), checkedAt: new Date().toISOString(), results }, 200, { 'Cache-Control': 'no-store' });
}

/* ── 책 검색 ─────────────────────────────────────────────── */

/** "아몬드 :손원평 장편소설" → "아몬드", "(趙廷來 大河小說) 太白山脈" → "太白山脈" */
function cleanTitle(raw = '') {
  let s = raw.split(/\s*\/\s*/)[0].split(/\s*=\s*/)[0].split(/\s*[:：]\s*/)[0].trim();
  const lead = s.match(/^\(([^)]*)\)\s*(.+)$/);
  if (lead) s = /^(the|a|an)$/i.test(lead[1].trim()) ? `${lead[1].trim()} ${lead[2]}` : lead[2];
  return s.replace(/\s*\(.*?\)\s*$/, '').replace(/\s*[.,;]\s*$/, '').trim();
}
/** "지은이: 한강 ;옮긴이: …" → "한강" */
function cleanAuthor(raw = '') {
  return raw.split(/\s*[;；,，]\s*/)[0]
    .replace(/^(지은이|글|저자|엮은이|원작)\s*[:：]\s*/, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*(글·그림|지음|저|글|엮음|원작|著)\s*$/, '')
    .trim();
}
const squash = (s) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');

/**
 * GET /search?q=소년이 온다
 *   → { books: [{ title, author, coverImageUrl, isbns: [...최대 3] }, ...] }
 * 정보나루 도서 검색(제목, 대출 많은 순). 검색어가 제목에 실제로 들어 있는 책만 남기고,
 * 같은 책의 판본들은 한 권으로 묶는다(대출 많은 판본부터 3개까지 ISBN 을 모은다).
 * 같은 검색은 하루 동안 기억한다 — 책 목록은 자주 바뀌지 않는다.
 */
async function search(url, env) {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 60);
  if (squash(q).length < 2) return json({ error: '검색어를 두 글자 이상 주세요' }, 400);

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`https://loan-cache.internal/search-v2/${encodeURIComponent(squash(q))}`);
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return json(await hit.json(), 200, { 'Cache-Control': 'no-store' });
  }

  const api = `https://data4library.kr/api/srchBooks?authKey=${encodeURIComponent(env.DATA4LIBRARY_KEY)}` +
    `&title=${encodeURIComponent(q)}&pageSize=40&format=json`;
  let docs = [];
  try {
    const res = await fetch(api);
    if (!res.ok) return json({ error: '정보나루가 답하지 않습니다' }, 502);
    docs = ((await res.json())?.response?.docs ?? []).map((d) => d.doc).filter((b) => b?.bookname && /^\d{13}$/.test(b.isbn13 ?? ''));
  } catch {
    return json({ error: '정보나루가 답하지 않습니다' }, 502);
  }

  const want = squash(q);
  const groups = new Map();
  for (const b of docs) {
    const title = cleanTitle(b.bookname);
    // 본제목에 검색어가 있어야 한다 — 부제·총서명에만 걸린 책(「채식주의자」에 「생태계와 먹이사슬」)은 뺀다
    if (!squash(title).includes(want)) continue;
    const author = cleanAuthor(b.authors);
    const key = `${squash(title)}|${squash(author)}`;
    const g = groups.get(key) ?? { title, author, coverImageUrl: undefined, editions: [] };
    g.editions.push({ isbn: b.isbn13, loans: Number(b.loan_count) || 0 });
    if (!g.coverImageUrl && b.bookImageURL) g.coverImageUrl = b.bookImageURL.replace(/^http:/, 'https:');
    groups.set(key, g);
  }
  const books = [...groups.values()]
    .map((g) => ({
      title: g.title,
      author: g.author,
      coverImageUrl: g.coverImageUrl,
      loans: g.editions.reduce((n, e) => n + e.loans, 0),
      isbns: g.editions.sort((a, b) => b.loans - a.loans).slice(0, MAX_EDITIONS).map((e) => e.isbn),
    }))
    .sort((a, b) => b.loans - a.loans)
    .slice(0, 15);

  const body = { q, books };
  if (cache) {
    await cache.put(cacheKey, new Response(JSON.stringify(body), { headers: { 'Cache-Control': 'max-age=86400' } }));
  }
  return json(body, 200, { 'Cache-Control': 'no-store' });
}

export default { fetch: handle };
