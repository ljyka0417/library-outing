/**
 * 홈의 "나이대별 많이 빌린 책"과 "이달의 키워드" — 정보나루에서 미리 모아 앱에 담는다.
 *
 *   npm run collect-trend-books
 *
 * 앱이 열릴 때마다 묻지 않는다. 정보나루는 하루 500건까지만 답하므로(그 이상은 고정 IP 등록 필요)
 * 여기서 한 번 모아 두면 앱 사용 중에는 한도를 쓰지 않는다. 한 번 돌리면 약 35건.
 *
 *  - 나이대: loanItemSrch 에 age(·gender)를 주고 최근 3개월 전국 순위. 나이대 8 × (전체·여성·남성) = 24건.
 *    같은 시리즈의 여러 권(흔한남매 1·2·3…)이 순위를 다 차지하므로 제목이 같은 책은 한 권으로 본다.
 *  - 키워드: monthlyKeywords(지난달) 위에서 KEYWORDS 개, 낱말마다 srchBooks(제목, 대출 많은 순) 1건.
 *    keyword 검색은 책에 붙은 키워드 색인을 뒤져서 "아버지" → 『종의 기원』처럼 왜 나왔는지 모를 책이 섞였다.
 *    그래서 제목에 그 낱말이 든 책을 보이고, 화면에도 그렇게 적는다. (책 제목이 그대로 키워드인 달도 있다)
 *    키워드는 한국어 원문이다. 외국어 화면용 번역은 src/i18n/library-text/keywords.json 에 둔다
 *    (빠진 것은 node scripts/check-library-text.cjs 가 알려 준다).
 *
 * 결과: src/data/trend-books.generated.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';
import { titleForms, disambiguate, cleanAuthor } from './lib/books.mjs';

const KEY = requireEnv('DATA4LIBRARY_KEY', `.env 에  DATA4LIBRARY_KEY=발급받은키  를 넣으세요.`);
const PER_LIST = 10;
const DAYS = 90;
const KEYWORDS = 8;
const PER_KEYWORD = 8;

/** 화면의 나이대 → 정보나루 age 코드 (0 영유아, 6 유아, 8 초등, 14 청소년, 20 … 60 이상) */
const AGES = { kids: '0;6', children: '8', teens: '14', '20s': '20', '30s': '30', '40s': '40', '50s': '50', '60s': '60' };
const GENDERS = { all: '', female: '1', male: '0' };

const ymd = (d) => d.toISOString().slice(0, 10);
const end = new Date();
const start = new Date(end.getTime() - DAYS * 86400000);
const lastMonth = (() => {
  const d = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

async function api(op, query) {
  const res = await fetch(`https://data4library.kr/api/${op}?authKey=${KEY}&format=json&${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (body?.response?.errCode === 'outOflimit' || body?.response?.error) throw new Error(body.response.error ?? body.response.errCode);
  return body.response;
}

/** 정보나루 책 목록 → 앱 책 (판본·시리즈 겹침 없애고 위에서 n권) */
function toBooks(docs, n) {
  const rows = docs.map((d) => d.doc).filter((b) => b?.bookname).map((b) => {
    const { short, full } = titleForms(b.bookname);
    return {
      short, full,
      vol: String(b.vol ?? '').trim(),
      author: cleanAuthor(b.authors),
      isbn: b.isbn13 || undefined,
      coverImageUrl: b.bookImageURL ? b.bookImageURL.replace(/^http:/, 'https:') : undefined,
    };
  }).filter((b) => b.short)
    .filter((b, i, all) => all.findIndex((x) => x.short === b.short) === i);
  return disambiguate(rows).slice(0, n).map((b) => {
    const out = { title: b.title, author: b.author, isbn: b.isbn, coverImageUrl: b.coverImageUrl };
    for (const k of Object.keys(out)) if (!out[k]) delete out[k];
    return out;
  });
}

const failed = [];

// ── 나이대
const ages = {};
for (const [age, code] of Object.entries(AGES)) {
  for (const [gender, g] of Object.entries(GENDERS)) {
    try {
      const r = await api('loanItemSrch', `age=${encodeURIComponent(code)}${g ? `&gender=${g}` : ''}&startDt=${ymd(start)}&endDt=${ymd(end)}&pageSize=60`);
      const books = toBooks(r.docs ?? [], PER_LIST);
      if (books.length) (ages[age] ??= {})[gender] = books;
      else failed.push(`${age}/${gender}(빈 응답)`);
      console.log(`  ${age.padEnd(8)} ${gender.padEnd(6)} ${books.length}권  ${books.slice(0, 3).map((b) => b.title).join(' · ')}`);
    } catch (e) {
      failed.push(`${age}/${gender}(${e.message})`);
    }
    await sleep(250);
  }
}

// ── 이달의 키워드
const keywords = [];
try {
  const r = await api('monthlyKeywords', `month=${lastMonth}`);
  const words = (r.keywords ?? []).map((k) => k.keyword?.word).filter(Boolean);
  for (const word of words) {
    if (keywords.length >= KEYWORDS) break;
    await sleep(250);
    try {
      const s = await api('srchBooks', `title=${encodeURIComponent(word)}&sort=loan&order=desc&pageSize=30`);
      // 부제에만 낱말이 있는 책(「…아들에게 들려주는」)은 화면 제목에 낱말이 안 보여서 뺀다
      const squash = (t) => t.replace(/\s+/g, '');
      const books = toBooks(s.docs ?? [], 30).filter((b) => squash(b.title).includes(squash(word))).slice(0, PER_KEYWORD);
      if (books.length) keywords.push({ word, books });
      console.log(`  #${word} ${books.length}권  ${books.slice(0, 3).map((b) => b.title).join(' · ')}`);
    } catch (e) {
      failed.push(`#${word}(${e.message})`);
    }
  }
} catch (e) {
  failed.push(`키워드(${e.message})`);
}

const OUT = path.join(ROOT, 'src/data/trend-books.generated.json');
// 이번에 못 받은 것은 지난 결과를 그대로 둔다 (한도에 걸려 반쯤 빈 파일이 되지 않게)
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const merged = { ...(prev.ages ?? {}) };
for (const [age, byGender] of Object.entries(ages)) merged[age] = { ...(merged[age] ?? {}), ...byGender };
fs.writeFileSync(OUT, JSON.stringify({
  _readme: '정보나루 나이대별 대출 순위(최근 3개월, 전국)와 이달의 키워드. 직접 고치지 마세요 — npm run collect-trend-books 가 덮어씁니다.',
  _generatedAt: new Date().toISOString(),
  _period: { start: ymd(start), end: ymd(end) },
  ages: merged,
  keywords: keywords.length ? { month: lastMonth, items: keywords } : prev.keywords ?? { month: lastMonth, items: [] },
}, null, 2) + '\n');
console.log(`\n나이대 ${Object.keys(ages).length}/${Object.keys(AGES).length}, 키워드 ${keywords.length}개 → ${path.relative(ROOT, OUT)}`);
if (failed.length) console.log(`못 받은 것: ${failed.join(', ')}`);
