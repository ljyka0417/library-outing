/**
 * 지역별 "요즘 많이 빌린 책" — 홈 화면의 지역 선택 책 줄에 쓴다.
 *
 *   npm run collect-region-books
 *
 * 정보나루 loanItemSrch 를 지역 코드로 부른다. 기간은 최근 3개월.
 * (기간을 안 주면 2016년부터 쌓인 누적 순위가 와서 오래된 책이 위에 남는다)
 *
 * 지역은 가이드북 분류를 따른다. 충청·전라·경상은 두 도를 묶어 한 번에 묻는다
 * (정보나루는 region=33;34 처럼 세미콜론으로 여러 지역을 받는다).
 *
 * 결과: src/data/region-books.generated.json  { regions: { 서울: { books: [...] }, ... } }
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';
import { titleForms, disambiguate, cleanAuthor } from './lib/books.mjs';

const KEY = requireEnv('DATA4LIBRARY_KEY', `.env 에  DATA4LIBRARY_KEY=발급받은키  를 넣으세요.`);
const PER_REGION = 10;
const DAYS = 90;

/** 가이드북 지역 → 정보나루 지역 코드 */
const REGIONS = {
  서울: '11', 경기: '31', 인천: '23', 강원: '32', 충청: '33;34', 대전: '25', 세종: '29',
  전라: '35;36', 광주: '24', 경상: '37;38', 대구: '22', 울산: '26', 부산: '21', 제주: '39',
};

const ymd = (d) => d.toISOString().slice(0, 10);
const end = new Date();
const start = new Date(end.getTime() - DAYS * 86400000);

async function fetchRegion(code) {
  const url = `https://data4library.kr/api/loanItemSrch?authKey=${KEY}&region=${code}` +
    `&startDt=${ymd(start)}&endDt=${ymd(end)}&pageSize=50&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const docs = (await res.json())?.response?.docs ?? [];
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
    // 같은 책의 다른 판본(양장·개정판)이 따로 순위에 오른다. 순위표에서는 한 권으로 본다 — 위의 것만 남긴다
    .filter((b, i, all) => all.findIndex((x) => x.short === b.short) === i);
  return disambiguate(rows).slice(0, PER_REGION).map((b) => {
    const out = { title: b.title, author: b.author, isbn: b.isbn, coverImageUrl: b.coverImageUrl };
    for (const k of Object.keys(out)) if (!out[k]) delete out[k];
    return out;
  });
}

const regions = {};
const failed = [];
for (const [name, code] of Object.entries(REGIONS)) {
  try {
    const books = await fetchRegion(code);
    if (books.length) regions[name] = { books };
    else failed.push(`${name}(빈 응답)`);
    console.log(`  ${name.padEnd(3)} ${books.length}권  ${books.slice(0, 3).map((b) => b.title).join(' · ')}`);
  } catch (e) {
    failed.push(`${name}(${e.message})`);
  }
  await sleep(250);
}

const OUT = path.join(ROOT, 'src/data/region-books.generated.json');
fs.writeFileSync(OUT, JSON.stringify({
  _readme: '정보나루 지역별 대출 순위(최근 3개월). 직접 고치지 마세요 — npm run collect-region-books 가 덮어씁니다.',
  _generatedAt: new Date().toISOString(),
  _period: { start: ymd(start), end: ymd(end) },
  regions,
}, null, 2) + '\n');
console.log(`\n지역 ${Object.keys(regions).length}/${Object.keys(REGIONS).length}곳 → ${path.relative(ROOT, OUT)}`);
if (failed.length) console.log(`못 받은 곳: ${failed.join(', ')}`);
