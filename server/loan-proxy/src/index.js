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
 *   - 같은 질문은 기억해 둔다(메모리 + 모두가 함께 쓰는 KV, 아래 askMany).
 *     정보나루 하루 호출 한도(500건)를 아끼고 더 빨리 답한다.
 */
import LIBS from './libs.js';
import { weather } from './weather.js';
import { culture } from './culture.js';
import { air } from './air.js';
import { book } from './book.js';
import { bus } from './bus.js';

const ALLOWED = new Set(LIBS);
const MAX_BOOKS = 10;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });

/*
 * 같은 질문은 두 겹으로 기억한다.
 *
 *  1) 이 서버의 메모리 — 가장 빠르지만 서버(인스턴스)가 여럿이고 새로 뜨면 비워진다.
 *  2) KV(LOAN_KV) — 모든 사용자·모든 서버가 함께 쓴다. 누가 「부산에서 소년이 온다」를 물었으면
 *     잠시 뒤 같은 것을 묻는 사람은 정보나루 한도를 쓰지 않는다.
 *
 * 기억하는 시간: 그 도서관에 책이 없으면 3일(소장은 잘 바뀌지 않는다), 있으면 30분(대출 상태는 바뀐다).
 * 그래서 앱은 "방금"이 아니라 "30분 안에 확인"이라고 말한다.
 *
 * 처음엔 Cloudflare Cache API 에 담았는데, 무료 요금제는 한 번 부를 때 바깥 요청을 50번까지만
 * 허락하고 캐시 읽기·쓰기도 그 수에 들어 전부 실패했다(부산, 2026-10-03). 그래서 KV 는
 * 한 번에 여러 개를 읽고(최대 100개씩), 쓰기는 실패해도 답에는 영향이 없게 한다.
 */
const MEM = new Map();
const MEM_MAX = 5000;
const TTL_OWNED = 30 * 60;
const TTL_NOT_OWNED = 3 * 24 * 3600;
const ttlOf = (v) => (v.hasBook ? TTL_OWNED : TTL_NOT_OWNED);
const pairKey = (lib, isbn) => `${lib}|${isbn}`;
const kvKey = (lib, isbn) => `loan:${lib}:${isbn}`;

function remember(key, value) {
  if (MEM.size >= MEM_MAX) MEM.delete(MEM.keys().next().value);
  MEM.set(key, { until: Date.now() + ttlOf(value) * 1000, value });
}

/**
 * 정보나루 부르기.
 *
 * 하루 500건을 넘기려면 정보나루에 "부르는 서버의 IP" 를 등록해야 한다(하루 3만 건). Worker 는 나가는 IP 가
 * 매번 바뀌어 등록할 수 없으므로, 고정 IP 서버의 중계(server/relay)를 거친다. 키는 중계 서버에만 있고
 * 여기서는 비밀값(RELAY_SECRET)만 보낸다. 중계가 없거나 답이 없으면 예전처럼 직접 부른다(하루 500건).
 */
async function d4l(env, api, params) {
  const qs = new URLSearchParams({ ...params, format: 'json' });
  if (env.RELAY_URL && env.RELAY_SECRET) {
    try {
      const res = await fetch(`${env.RELAY_URL.replace(/\/$/, '')}/api/${api}?${qs}`, {
        headers: { 'x-relay-secret': env.RELAY_SECRET },
      });
      if (res.status < 500) return res;
    } catch {
      // 중계가 멈췄으면 직접
    }
  }
  qs.set('authKey', env.DATA4LIBRARY_KEY);
  return fetch(`https://data4library.kr/api/${api}?${qs}`);
}

/** 정보나루에 한 권 묻기. 실패하면 null (지어내지 않는다) */
async function fetchOne(env, lib, isbn) {
  try {
    // Accept 헤더를 붙이면 정보나루가 406 을 돌려준다 (format=json 으로 충분하다)
    const res = await d4l(env, 'bookExist', { libCode: lib, isbn13: isbn });
    if (!res.ok) return null;
    const result = (await res.json())?.response?.result;
    if (!result || (result.hasBook !== 'Y' && result.hasBook !== 'N')) return null;
    return { hasBook: result.hasBook === 'Y', loanAvailable: result.loanAvailable === 'Y' };
  } catch {
    return null;
  }
}

/** [도서관, ISBN] 여럿을 한꺼번에 — 메모리 → KV → 정보나루 차례로. 돌려주는 Map 의 키는 pairKey */
async function askMany(env, pairs) {
  const out = new Map();
  const now = Date.now();
  let missing = [];
  for (const [lib, isbn] of pairs) {
    const hit = MEM.get(pairKey(lib, isbn));
    if (hit && hit.until > now) out.set(pairKey(lib, isbn), hit.value);
    else missing.push([lib, isbn]);
  }
  if (missing.length && env.LOAN_KV) {
    try {
      const got = new Map();
      const keys = missing.map(([lib, isbn]) => kvKey(lib, isbn));
      for (let i = 0; i < keys.length; i += 100) {
        const part = await env.LOAN_KV.get(keys.slice(i, i + 100), 'json');
        for (const [k, v] of part) if (v) got.set(k, v);
      }
      missing = missing.filter(([lib, isbn]) => {
        const v = got.get(kvKey(lib, isbn));
        if (!v) return true;
        out.set(pairKey(lib, isbn), v);
        remember(pairKey(lib, isbn), v);
        return false;
      });
    } catch {
      // KV 가 안 되면 정보나루에 바로 묻는다
    }
  }
  // 기억에서 꺼낸 수 — 응답에 실어 한도를 얼마나 아꼈는지 볼 수 있게
  out.cached = pairs.length - missing.length;
  const fresh = await Promise.all(missing.map(([lib, isbn]) => fetchOne(env, lib, isbn)));
  const writes = [];
  missing.forEach(([lib, isbn], i) => {
    const v = fresh[i];
    out.set(pairKey(lib, isbn), v);
    if (!v) return;
    remember(pairKey(lib, isbn), v);
    if (env.LOAN_KV) writes.push(env.LOAN_KV.put(kvKey(lib, isbn), JSON.stringify(v), { expirationTtl: ttlOf(v) }));
  });
  // 쓰기는 실패해도(한도 등) 답에는 영향이 없다
  await Promise.allSettled(writes);
  return out;
}

export async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'GET') return json({ error: 'GET 만 받습니다' }, 405);

  const url = new URL(request.url);
  // 날씨·미세먼지·문화 행사는 공공데이터포털 키(DATA_GO_KR_KEY)를 쓴다 — 정보나루 키 검사보다 먼저
  if (url.pathname === '/weather') return weather(url, env, json);
  if (url.pathname === '/air') return air(url, env, json);
  if (url.pathname === '/culture' || url.pathname === '/culture/detail') return culture(url, env, json);
  if (url.pathname === '/bus') return bus(url, env, json);
  // 책 소개는 카카오 키(KAKAO_REST_KEY)를 쓴다
  if (url.pathname === '/book') return book(url, env, json);
  if (!env.DATA4LIBRARY_KEY) return json({ error: '서버에 DATA4LIBRARY_KEY 가 설정되지 않았습니다' }, 500);
  if (url.pathname === '/where') return where(url, env);
  if (url.pathname === '/search') return search(url, env);
  if (url.pathname === '/related') return related(url, env);
  if (url.pathname !== '/loan') return json({ error: '없는 주소입니다. /loan · /where · /search · /related 로 물어 주세요' }, 404);

  const lib = url.searchParams.get('lib') ?? '';
  if (!ALLOWED.has(lib)) return json({ error: '이 앱에 실린 도서관이 아닙니다' }, 400);

  const isbns = [...new Set((url.searchParams.get('isbn') ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (isbns.length === 0 || isbns.length > MAX_BOOKS || isbns.some((s) => !/^\d{13}$/.test(s))) {
    return json({ error: `ISBN(숫자 13자리)을 1~${MAX_BOOKS}개 쉼표로 이어 주세요` }, 400);
  }

  const answers = await askMany(env, isbns.map((isbn) => [lib, isbn]));
  const results = Object.fromEntries(isbns.map((isbn) => [isbn, answers.get(pairKey(lib, isbn)) ?? null]));
  return json({ lib, checkedAt: new Date().toISOString(), cached: answers.cached, results }, 200, { 'Cache-Control': 'no-store' });
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
/** 무료 요금제의 바깥 요청 한도(50) 아래로: 도서관 수 × 판본 수 */
const MAX_ASKS = 45;
const MAX_EDITIONS = 3;
async function where(url, env) {
  const isbns = [...new Set((url.searchParams.get('isbn') ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (isbns.length === 0 || isbns.length > MAX_EDITIONS || isbns.some((s) => !/^\d{13}$/.test(s))) {
    return json({ error: `ISBN(숫자 13자리)을 1~${MAX_EDITIONS}개 주세요` }, 400);
  }
  const libs = [...new Set((url.searchParams.get('libs') ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (libs.length === 0 || libs.length > MAX_LIBS) return json({ error: `도서관 코드를 1~${MAX_LIBS}개 쉼표로 이어 주세요` }, 400);
  if (libs.some((l) => !ALLOWED.has(l))) return json({ error: '이 앱에 실린 도서관이 아닌 코드가 있습니다' }, 400);
  if (libs.length * isbns.length > MAX_ASKS) {
    return json({ error: `도서관 수 × 판본 수가 ${MAX_ASKS}을 넘습니다. 나눠서 물어 주세요` }, 400);
  }

  const all = await askMany(env, libs.flatMap((lib) => isbns.map((isbn) => [lib, isbn])));
  const results = {};
  for (const lib of libs) {
    const answers = isbns.map((isbn) => all.get(pairKey(lib, isbn))).filter(Boolean);
    results[lib] = answers.length
      ? { hasBook: answers.some((a) => a.hasBook), loanAvailable: answers.some((a) => a.hasBook && a.loanAvailable) }
      : null;
  }
  return json({ isbn: isbns.join(','), checkedAt: new Date().toISOString(), cached: all.cached, results }, 200, { 'Cache-Control': 'no-store' });
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

  // 같은 검색은 모두가 함께 쓰는 KV 에 하루 동안 기억한다 (KV 가 없으면 Cache API)
  const kvSearchKey = `search:v4:${squash(q)}`;
  const cache = !env.LOAN_KV && typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`https://loan-cache.internal/search-v3/${encodeURIComponent(squash(q))}`);
  try {
    const hit = env.LOAN_KV ? await env.LOAN_KV.get(kvSearchKey, 'json') : cache ? await (await cache.match(cacheKey))?.json() : null;
    if (hit) return json(hit, 200, { 'Cache-Control': 'no-store' });
  } catch {
    // 기억을 못 읽으면 정보나루에 묻는다
  }


  let docs = [];
  try {
    const res = await d4l(env, 'srchBooks', { title: q, pageSize: '40' });
    if (!res.ok) return json({ error: '정보나루가 답하지 않습니다' }, 502);
    const response = (await res.json())?.response;
    // 하루 호출 한도(500건)를 넘기면 정보나루가 결과 대신 오류를 준다. 그걸 "검색 결과 없음"으로
    // 하루 동안 기억해 버린 적이 있다 — 오류는 오류로 돌려주고 기억하지 않는다
    if (response?.error || response?.errCode) {
      return json({ error: response.errCode === 'outOflimit' ? 'quota' : '정보나루 오류' }, 503);
    }
    docs = (response?.docs ?? []).map((d) => d.doc).filter((b) => b?.bookname && /^\d{13}$/.test(b.isbn13 ?? ''));
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
  try {
    if (env.LOAN_KV) await env.LOAN_KV.put(kvSearchKey, JSON.stringify(body), { expirationTtl: 86400 });
    else if (cache) await cache.put(cacheKey, new Response(JSON.stringify(body), { headers: { 'Cache-Control': 'max-age=86400' } }));
  } catch {
    // 못 적어도 답은 준다
  }
  return json(body, 200, { 'Cache-Control': 'no-store' });
}

export default { fetch: handle };

/* ── 함께 빌린 책 ────────────────────────────────────────── */

/**
 * GET /related?isbn=9788936434120
 *   → { books: [{ title, author, coverImageUrl, isbns: [...최대 3] }, ...최대 10] }
 * 정보나루 도서별 이용 분석(usageAnalysisList)의 "함께 대출된 도서". 같은 책의 판본은 한 권으로 묶고,
 * 물어본 책 자신(다른 판본)은 뺀다. 이 통계는 천천히 바뀌어서 모두가 함께 쓰는 KV 에 7일 기억한다.
 */
async function related(url, env) {
  const isbn = (url.searchParams.get('isbn') ?? '').trim();
  if (!/^\d{13}$/.test(isbn)) return json({ error: 'ISBN(숫자 13자리)을 주세요' }, 400);
  const kvKey = `related:v1:${isbn}`;
  try {
    const hit = env.LOAN_KV ? await env.LOAN_KV.get(kvKey, 'json') : null;
    if (hit) return json(hit, 200, { 'Cache-Control': 'no-store' });
  } catch {
    // 기억을 못 읽으면 정보나루에 묻는다
  }

  let response;
  try {
    const res = await d4l(env, 'usageAnalysisList', { isbn13: isbn });
    if (!res.ok) return json({ error: '정보나루가 답하지 않습니다' }, 502);
    response = (await res.json())?.response;
  } catch {
    return json({ error: '정보나루가 답하지 않습니다' }, 502);
  }
  // 한도 초과·오류는 기억하지 않는다 (빈 결과로 7일 굳어 버리지 않게)
  if (response?.error || response?.errCode) {
    return json({ error: response.errCode === 'outOflimit' ? 'quota' : '정보나루 오류' }, 503);
  }

  const self = response?.book ? squash(cleanTitle(response.book.bookname ?? '')) : '';
  const groups = new Map();
  for (const item of response?.coLoanBooks ?? []) {
    const b = item?.book;
    if (!b?.bookname || !/^\d{13}$/.test(b.isbn13 ?? '')) continue;
    const title = cleanTitle(b.bookname);
    if (!title || squash(title) === self) continue;
    const author = cleanAuthor(b.authors);
    const key = `${squash(title)}|${squash(author)}`;
    const g = groups.get(key) ?? { title, author, coverImageUrl: undefined, isbns: [] };
    if (g.isbns.length < MAX_EDITIONS) g.isbns.push(b.isbn13);
    if (!g.coverImageUrl && b.bookImageURL) g.coverImageUrl = b.bookImageURL.replace(/^http:/, 'https:');
    groups.set(key, g);
  }
  const body = { isbn, books: [...groups.values()].slice(0, 10) };
  try {
    if (env.LOAN_KV) await env.LOAN_KV.put(kvKey, JSON.stringify(body), { expirationTtl: 7 * 24 * 3600 });
  } catch {
    // 못 적어도 답은 준다
  }
  return json(body, 200, { 'Cache-Control': 'no-store' });
}
