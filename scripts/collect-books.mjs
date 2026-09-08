/**
 * 도서관별 인기 대출 도서를 수집한다.
 *
 *   npm run collect-books
 *
 * 정보나루에는 비슷한 이름의 API 가 둘 있는데, 하는 일이 완전히 다르다:
 *
 *   loanItemSrch       전국 인기대출도서. libCode 를 넘겨도 무시하고
 *                      항상 같은 전국 순위를 돌려준다.
 *   loanItemSrchByLib  도서관별 대출 순위. 우리가 원하는 것.
 *
 * 처음엔 앞의 것을 썼고, 서울도서관 하나만 확인하고 넘어가는 바람에
 * 132곳 전부가 같은 목록을 보여주는 채로 나갔다. 반드시 서로 다른 두 곳을
 * 비교해서 검증할 것 — 스크립트 끝에서 자동으로 확인한다.
 *
 * 지금까지는 "이 주제 도서관이면 이런 책" 식으로 주제별 추천을 보여줬다.
 * 그럴듯하긴 해도 그 도서관과는 아무 상관 없는 목록이었다.
 * 이걸 실제 대출 데이터로 바꾸면 "이 도서관에서 사람들이 실제로 많이 빌린 책"이 된다.
 *
 * ⚠️ 표지 이미지에 대하여
 *   API 가 알라딘·네이버의 이미지 URL 을 돌려준다. 이건 정보나루가 도서관 서비스
 *   활용을 위해 제공하는 것이지만, 외부 이미지를 직접 링크하는 방식이라
 *   (1) 링크가 끊길 수 있고 (2) 상업적 배포 시 별도 확인이 필요할 수 있다.
 *   앱은 표지가 없으면 제목으로 표지 모양을 그리도록 이미 만들어 두었으므로,
 *   문제가 되면 coverImageUrl 만 비우면 된다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, readSeeds, sleep, progress } from './lib/env.mjs';
import { similarity, strip } from './lib/match.mjs';

const KEY = requireEnv(
  'DATA4LIBRARY_KEY',
  `.env 에  DATA4LIBRARY_KEY=발급받은키  를 넣으세요.
https://www.data4library.kr 에서 발급받을 수 있습니다.`
);

/** 도서관당 가져올 권수 */
const PER_LIBRARY = 8;

const seeds = readSeeds();

/** 정보나루 도서관 코드는 enrich 단계에서 sourceApiId 로 저장해 뒀다 */
const enriched = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/libraries.enriched.json'), 'utf8')
).entries ?? {};

const targets = seeds
  .map((s) => ({ ...s, libCode: enriched[s.id]?.sourceApiId }))
  .filter((s) => s.libCode);

if (targets.length === 0) {
  console.error(`
정보나루 도서관 코드가 있는 곳이 없습니다.
  먼저  npm run enrich  를 돌려 도서관을 매칭하세요.
`);
  process.exit(1);
}

console.log(`인기 대출 도서 수집`);
console.log(`  대상 ${targets.length} / ${seeds.length}곳 (정보나루에 매칭된 곳)`);
console.log(`  도서관당 ${PER_LIBRARY}권\n`);

/**
 * 서지 표기를 걷어내고 책 제목만 남긴다.
 *
 * 도서관 목록 데이터는 MARC 관례를 따라 한 필드에 여러 정보를 이어 붙인다:
 *   :  부제        "아몬드 :손원평 장편소설"
 *   =  병렬서명    "종의 기원 =The origin of species"
 *   /  저자사항    "종의 기원 /정유정 지음"
 * 셋 중 가장 먼저 나오는 구분자 앞까지만 취한다.
 */
function cleanTitle(raw = '') {
  return raw
    .split(/\s*[:：=/]\s*/)[0]
    .replace(/\s*\(.*?\)\s*$/, '')
    .replace(/\s*[.,;]\s*$/, '')
    .trim();
}

/** "지은이: 한강 ;옮긴이: 양윤옥" → "한강" */
function cleanAuthor(raw = '') {
  const first = raw.split(/\s*[;；]\s*/)[0];
  return first.replace(/^(지은이|글|저자|엮은이)\s*[:：]\s*/, '').trim();
}

async function fetchBooks(libCode) {
  const url =
    `https://data4library.kr/api/loanItemSrchByLib?authKey=${KEY}` +
    `&libCode=${libCode}&format=json&pageSize=${PER_LIBRARY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('응답을 해석할 수 없습니다 (인증키 확인 필요)');
  }

  const docs = json?.response?.docs ?? [];
  const books = docs
    .map((d) => d.doc)
    .filter((b) => b?.bookname)
    .map((b) => {
      // 시리즈물은 bookname 이 전권 같고 권 번호가 vol 에 따로 온다.
      // 어린이 도서관은 상위권이 한 시리즈로 채워지는 일이 흔해서,
      // 권수를 안 붙이면 같은 제목 여덟 개가 늘어선다.
      const vol = String(b.vol ?? '').trim();
      // vol 은 "11" 뿐 아니라 "v.1" 처럼도 오므로 정규식에 넣기 전에 이스케이프한다
      const volRe = vol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const base = cleanTitle(b.bookname);
      const alreadyHasVol = vol && new RegExp(`(^|\\s)${volRe}\\s*권?$`).test(base);
      const out = {
        title: vol && !alreadyHasVol ? `${base} ${vol}권` : base,
        author: cleanAuthor(b.authors),
        isbn: b.isbn13 || undefined,
        // http 이미지는 iOS 에서 차단되므로 https 로 올린다
        coverImageUrl: b.bookImageURL ? b.bookImageURL.replace(/^http:/, 'https:') : undefined,
      };
      for (const k of Object.keys(out)) if (!out[k]) delete out[k];
      return out;
    })
    .filter((b) => b.title);

  // 응답에 도서관 이름이 같이 온다. 코드가 엉뚱한 곳을 가리키고 있으면 여기서 잡힌다.
  return { books, libNm: json?.response?.libNm ?? '' };
}

const byLibrary = {};
let ok = 0;
const failed = [];
const nameMismatch = [];

for (let i = 0; i < targets.length; i++) {
  const t = targets[i];
  progress(i, targets.length, t.name);
  try {
    const { books, libNm } = await fetchBooks(t.libCode);
    if (books.length > 0) {
      byLibrary[t.id] = books;
      ok++;
      // 정보나루는 "전남광주통합특별시 북구 운암도서관" 처럼 행정구역을 앞에 붙여 준다.
      // 그래서 유사도만 보면 멀쩡한 매칭도 경고가 뜬다 — 포함 관계도 같이 본다.
      const a = strip(libNm);
      const b = strip(t.name);
      if (libNm && !a.includes(b) && !b.includes(a) && similarity(a, b) < 0.6) {
        nameMismatch.push({ seed: t.name, api: libNm, libCode: t.libCode });
      }
    } else {
      failed.push(t);
    }
  } catch {
    failed.push(t);
  }
  await sleep(150);
}

process.stdout.write('\n\n');

fs.writeFileSync(
  path.join(ROOT, 'src/data/books.generated.json'),
  JSON.stringify(
    {
      _readme: [
        '정보나루 인기대출도서 API 로 수집한 도서관별 실제 대출 순위입니다.',
        '직접 고치지 마세요 — 다음 실행 때 덮어씁니다.',
        '생성: npm run collect-books',
        '비어 있으면 앱은 주제별 추천 도서로 떨어집니다.',
      ],
      _generatedAt: new Date().toISOString(),
      byLibrary,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

const totalBooks = Object.values(byLibrary).reduce((n, arr) => n + arr.length, 0);
const withCover = Object.values(byLibrary)
  .flat()
  .filter((b) => b.coverImageUrl).length;

console.log('─'.repeat(52));
console.log(`수집 성공  ${ok} / ${targets.length}곳 · 도서 ${totalBooks}권`);
console.log(`  표지 있음 ${withCover}권`);
if (failed.length > 0) {
  console.log(`\n대출 데이터가 없던 곳 ${failed.length}곳:`);
  for (const f of failed.slice(0, 10)) console.log(`  ${f.name} (${f.sido})`);
  if (failed.length > 10) console.log(`  ... 외 ${failed.length - 10}곳`);
}

if (nameMismatch.length > 0) {
  console.log(`\n⚠️  씨앗 이름과 정보나루 이름이 많이 다른 곳 ${nameMismatch.length}곳:`);
  for (const m of nameMismatch) {
    console.log(`  ${m.seed}  ←  ${m.api} (${m.libCode})`);
  }
  console.log('  enrich 단계의 매칭이 잘못됐을 수 있으니 확인하세요.');
}

/**
 * 목록이 도서관마다 실제로 다른지 확인한다.
 *
 * 전에 이 검증이 없어서, 전국 순위를 도서관별 순위인 척 보여주는 채로 나갔다.
 * 한 곳만 보면 그럴듯해 보이기 때문에 한 곳만 봐서는 알 수 없다.
 */
const distinct = new Set(
  Object.values(byLibrary).map((arr) => arr.map((b) => b.title).join('|'))
);

console.log('─'.repeat(52));
console.log(`서로 다른 목록  ${distinct.size} / ${ok}곳`);
if (ok > 1 && distinct.size === 1) {
  console.error(`
✗ 모든 도서관이 같은 목록입니다. 도서관별 데이터가 아닙니다.
  loanItemSrchByLib 가 아니라 loanItemSrch 를 부르고 있지 않은지 확인하세요.
`);
  process.exit(1);
}
console.log('→ src/data/books.generated.json 갱신 완료');
