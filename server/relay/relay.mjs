/**
 * 정보나루 고정 IP 중계 — 하루 500건 → 30,000건.
 *
 * 정보나루는 하루 500건을 넘기려면 "API 를 부르는 서버의 IP" 를 등록해야 한다(최대 3개, 하루 3만 건).
 * Cloudflare Worker 는 나가는 IP 가 매번 바뀌어 등록할 수가 없어서, 고정 IP 가 있는 작은 서버(오라클 무료
 * 서버)에서 이 프로그램을 돌리고 Worker 가 정보나루 대신 여기를 부른다. 캐시는 Worker 가 그대로 한다.
 *
 *   GET /api/{bookExist|srchBooks|usageAnalysisList|…}?…   → https://data4library.kr/api/…&authKey=키
 *   GET /health                                              → ok (살아 있는지 확인용, 비밀값 필요 없음)
 *
 * 지키는 것
 *   - 키는 이 서버의 /etc/larchive-relay.env 에만 있다 (저장소·Worker 요청에 실리지 않는다)
 *   - Worker 만 부를 수 있게 x-relay-secret 헤더를 확인한다 (모르는 사람이 우리 한도를 쓰지 못하게)
 *   - 정해 둔 API 이름만 통과시킨다
 *   - 주소(키가 붙은)를 로그에 남기지 않는다
 * 의존 패키지 없음 — Node 22 내장 http·fetch 만 쓴다. setup.sh 가 설치·자동 시작까지 한다.
 */
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const KEY = process.env.DATA4LIBRARY_KEY ?? '';
const SECRET = process.env.RELAY_SECRET ?? '';
const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED = new Set(['bookExist', 'srchBooks', 'usageAnalysisList', 'loanItemSrch', 'monthlyKeywords', 'libSrch', 'itemSrch']);

if (!KEY || !SECRET) {
  console.error('DATA4LIBRARY_KEY 와 RELAY_SECRET 이 필요합니다 (/etc/larchive-relay.env)');
  process.exit(1);
}

const secretOk = (got) => {
  // 붙여 넣다 따라온 앞뒤 공백은 무시한다
  const a = Buffer.from(String(got ?? '').trim());
  const b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
};

let served = 0;
// 비밀값이 틀려 거절한 수 — Worker 설정이 어긋났는지 /health 로 바로 알 수 있게
let rejected = 0;
const today = () => new Date().toISOString().slice(0, 10);
let day = today();

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://relay');
    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end(`ok ${day} ${served} rejected:${rejected}`);
    }
    const m = url.pathname.match(/^\/api\/([A-Za-z]+)$/);
    if (req.method !== 'GET' || !m || !ALLOWED.has(m[1])) {
      res.writeHead(404);
      return res.end();
    }
    if (!secretOk(req.headers['x-relay-secret'])) {
      rejected++;
      res.writeHead(403);
      return res.end();
    }

    url.searchParams.delete('authKey');
    url.searchParams.set('authKey', KEY);
    const target = `https://data4library.kr/api/${m[1]}?${url.searchParams}`;
    if (today() !== day) {
      day = today();
      served = 0;
    }
    served++;
    try {
      const r = await fetch(target, { signal: AbortSignal.timeout(10_000) });
      const body = Buffer.from(await r.arrayBuffer());
      res.writeHead(r.status, { 'content-type': r.headers.get('content-type') ?? 'application/json' });
      res.end(body);
    } catch {
      // 키가 붙은 주소는 남기지 않는다
      console.error(`${new Date().toISOString()} ${m[1]} 정보나루 응답 없음`);
      res.writeHead(502);
      res.end('{"error":"relay upstream"}');
    }
  })
  .listen(PORT, '127.0.0.1', () => console.log(`larchive relay :${PORT}`));
