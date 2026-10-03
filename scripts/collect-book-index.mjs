/**
 * "책으로 찾기"용 책 목록 — 많이 빌린 책을 미리 모아 앱에 담는다.
 *
 *   npm run collect-book-index
 *
 * 왜: 책 검색을 할 때마다 정보나루에 물으면 하루 500건 한도를 쓴다. 사람들이 찾는 책은 대개
 * 많이 빌린 책이라, 그 목록을 앱에 담아 두면 대부분은 앱 안에서 찾고 없을 때만 서버에 묻는다.
 *
 * 모으는 것 (loanItemSrch 는 한 번에 1,000권, 한 조건에 5,000권까지 준다):
 *   - 누적 대출 순위 5,000 (2016년부터)
 *   - 최근 1년 순위 5,000 (새 책)
 *   - 최근 1년 유아·어린이·청소년 순위 (그림책·학습만화가 위 목록에 덜 잡혀서)
 * 같은 책의 판본(양장·개정판)은 제목+지은이로 묶고, 대출 많은 판본부터 ISBN 3개까지 둔다.
 * 묶는 법은 중계 서버의 /search 와 같다 (server/loan-proxy/src/index.js 의 cleanTitle·cleanAuthor).
 *
 * 한 번 돌리면 정보나루 약 16건. 한 번 부르는 데 30초쯤 걸린다.
 * 결과: src/data/book-index.generated.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';

const KEY = requireEnv('DATA4LIBRARY_KEY', `.env 에  DATA4LIBRARY_KEY=발급받은키  를 넣으세요.`);
const ymd = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const yearAgo = new Date(today.getTime() - 365 * 86400000);
const RECENT = `&startDt=${ymd(yearAgo)}&endDt=${ymd(today)}`;

/** [이름, 조건, 몇 쪽(1,000권씩)] */
const QUERIES = [
  ['누적', '', 5],
  ['최근 1년', RECENT, 5],
  ['유아', `${RECENT}&age=0;6`, 2],
  ['어린이', `${RECENT}&age=8`, 2],
  ['청소년', `${RECENT}&age=14`, 2],
];

// ── 중계 서버 /search 와 같은 정리법
function cleanTitle(raw = '') {
  let s = raw.split(/\s*\/\s*/)[0].split(/\s*=\s*/)[0].split(/\s*[:：]\s*/)[0].trim();
  const lead = s.match(/^\(([^)]*)\)\s*(.+)$/);
  if (lead) s = /^(the|a|an)$/i.test(lead[1].trim()) ? `${lead[1].trim()} ${lead[2]}` : lead[2];
  return s.replace(/\s*\(.*?\)\s*$/, '').replace(/\s*[.,;]\s*$/, '').trim();
}
function cleanAuthor(raw = '') {
  return raw.split(/\s*[;；,，]\s*/)[0]
    .replace(/^(지은이|글|저자|엮은이|원작)\s*[:：]\s*/, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*(글·그림|지음|저|글|엮음|원작|著)\s*$/, '')
    .trim();
}
const squash = (s) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');

const editions = new Map(); // isbn → { title, author, cover, loans }
const failed = [];
for (const [name, cond, pages] of QUERIES) {
  let got = 0;
  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch(`https://data4library.kr/api/loanItemSrch?authKey=${KEY}&format=json&pageNo=${page}&pageSize=1000${cond}`);
      const body = await res.json();
      if (body?.response?.error || body?.response?.errCode) throw new Error(body.response.errCode ?? body.response.error);
      const docs = (body?.response?.docs ?? []).map((d) => d.doc).filter((b) => b?.bookname && /^\d{13}$/.test(b.isbn13 ?? ''));
      for (const b of docs) {
        const loans = Number(b.loan_count) || 0;
        const prev = editions.get(b.isbn13);
        // 여러 목록에 나온 판본은 대출 수가 큰 쪽(누적)을 쓴다
        if (prev && prev.loans >= loans) continue;
        editions.set(b.isbn13, {
          title: cleanTitle(b.bookname),
          author: cleanAuthor(b.authors),
          vol: String(b.vol ?? '').trim(),
          cover: b.bookImageURL ? b.bookImageURL.replace(/^http:/, 'https:') : '',
          loans,
        });
      }
      got += docs.length;
      if (docs.length < 1000) break;
    } catch (e) {
      failed.push(`${name} ${page}쪽(${e.message})`);
      break;
    }
    await sleep(300);
  }
  console.log(`  ${name.padEnd(5)} ${got}권`);
}

// 판본 묶기 — 제목+지은이. 권(흔한남매 1·2권…)도 한 권으로 묶는다 — 중계 서버 /search 와 같게.
// "어디서 빌려?"는 대출 많은 판본·권 3개 중 어느 것이든 있으면 "있음"으로 본다
const groups = new Map();
for (const [isbn, e] of editions) {
  if (!e.title) continue;
  const key = `${squash(e.title)}|${squash(e.author)}`;
  const g = groups.get(key) ?? { t: e.title, a: e.author, c: '', l: 0, eds: [] };
  g.eds.push({ isbn, loans: e.loans });
  g.l += e.loans;
  if (!g.c && e.cover) g.c = e.cover;
  groups.set(key, g);
}

// 표지 주소 앞부분이 거의 같아서 줄여 담는다 (앱이 되살린다, src/data/bookIndex.ts)
const COVER_PREFIX = 'https://image.aladin.co.kr/product/';
const books = [...groups.values()]
  .sort((a, b) => b.l - a.l)
  .map((g) => {
    const row = [g.t, g.a, g.eds.sort((x, y) => y.loans - x.loans).slice(0, 3).map((e) => e.isbn).join(','), g.l];
    if (g.c) row.push(g.c.startsWith(COVER_PREFIX) ? g.c.slice(COVER_PREFIX.length) : g.c);
    return row;
  });

const OUT = path.join(ROOT, 'src/data/book-index.generated.json');
if (books.length < 1000 && fs.existsSync(OUT)) {
  console.log(`\n${books.length}권밖에 못 받아서 지난 목록을 그대로 둡니다. 못 받은 것: ${failed.join(', ')}`);
  process.exit(1);
}
fs.writeFileSync(OUT, JSON.stringify({
  _readme: '책으로 찾기용 많이 빌린 책 목록 (정보나루). 직접 고치지 마세요 — npm run collect-book-index 가 덮어씁니다. 한 줄 = [제목, 지은이, ISBN들(쉼표), 대출 수, 표지]',
  _generatedAt: new Date().toISOString(),
  coverPrefix: COVER_PREFIX,
  books,
}) + '\n');
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`\n판본 ${editions.size}개 → 책 ${books.length}권, ${kb}KB → ${path.relative(ROOT, OUT)}`);
if (failed.length) console.log(`못 받은 것: ${failed.join(', ')}`);
