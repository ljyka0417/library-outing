/**
 * 도서관 정보 번역 검사 — 화면에 나오는 원문(한국어) 중 영어·일본어·중국어로 옮긴 말이 없는 것을 찾는다.
 *
 *   node scripts/check-library-text.cjs          빠진 것 목록
 *   node scripts/check-library-text.cjs --json   빠진 원문만 JSON 으로 (사전 채울 때)
 *
 * 옮긴 말 안에 한글이 남아 있는 것도 알린다. 괄호 안의 한글은 일부러 둔 것이다 —
 * 버스 정류장 이름은 안내 방송·표지판이 한국어라 원래 이름을 괄호로 함께 적는다.
 * (주소의 한국어 원문 줄은 화면이 따로 붙이므로 사전에는 없어야 한다.)
 */
const path = require('path');
const load = require('./lib/load-app-ts.cjs');
process.chdir(path.join(__dirname, '..'));
const { MOCK_LIBRARIES } = load('src/data/libraries.mock.ts');
const { libText, hasLibText, specialtyCategory } = load('src/i18n/libraryText.ts');
const progs = require('../src/data/book-programs.generated.json').byId;
// 주변 장소 종류·사진 출처 (도서관 화면의 주변 카드)
const nearbyText = JSON.stringify(require('../src/data/nearby.generated.json')) + JSON.stringify(require('../src/data/tour-photos.generated.json'));
// 이달의 키워드 (홈) — npm run collect-trend-books 로 바뀌면 새 낱말의 번역이 필요하다
const keywordItems = require('../src/data/trend-books.generated.json').keywords.items.map((k) => ['keywords', k.word]);
const nearbyItems = [...nearbyText.matchAll(/"(subCategory|credit)":"([^"]+)"/g)].map((m) => ['nearby', m[2]]);

const H = /[가-힣]/;
const FIELDS = ['address', 'closedDays', 'opened', 'holdings', 'transit'];
const missing = {};
const hangulLeft = [];
const seen = new Set();
for (const l of MOCK_LIBRARIES) {
  const items = FIELDS.map((f) => [f, l[f]]);
  items.push(['hours', l.hours?.label], ['sigungu', l.region.sigungu]);
  for (const p of progs[l.id]?.programs ?? []) items.push(['programs', p]);
  if (!specialtyCategory(l.specialty)) items.push(['specialty', l.specialty]);
  if (l === MOCK_LIBRARIES[0]) items.push(...nearbyItems, ...keywordItems);
  for (const [f, v] of items) {
    if (!v || !H.test(v) || seen.has(v)) continue;
    seen.add(v);
    for (const lang of ['en', 'ja', 'zh']) {
      if (!hasLibText(v, lang)) (missing[f] ??= new Set()).add(v);
      else if (H.test(libText(v, lang).replace(/[(（][^()（）]*[가-힣][^()（）]*[)）]/g, ''))) hangulLeft.push(`${lang} ${f}: ${v} → ${libText(v, lang)}`);
    }
  }
}
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(Object.fromEntries(Object.entries(missing).map(([f, s]) => [f, [...s]])), null, 1));
} else {
  for (const [f, s] of Object.entries(missing)) console.log(`${f}: ${s.size} 빠짐`);
  if (hangulLeft.length) console.log(`한글이 남은 번역 ${hangulLeft.length}개\n` + hangulLeft.slice(0, 30).join('\n'));
  if (!Object.keys(missing).length && !hangulLeft.length) console.log('모두 옮겼어요');
}
