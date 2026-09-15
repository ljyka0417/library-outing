/**
 * 달곰이 추천 문구 검사 + 목록 만들기.
 *
 *   npm run chat-ideas          검사하고 통과한 것을 src/data/chat-ideas.generated.json 에 적는다
 *   npm run chat-ideas -- --check   적지 않고 검사만 한다 (지금 목록이 아직 맞는지)
 *
 * 추천 칩은 누르면 그 글자가 그대로 질문이 된다. 그래서 권할 수 있는 문구를
 * 전부 **실제 달곰이(src/utils/assistant.ts)에게 네 가지 말로 물어보고**,
 * 기대한 답이 나온 것만 앱에 넣는다. 한 가지 말에서라도 틀리면 뺀다 —
 * 언어를 바꿔도 같은 칩이 그 말로 바뀌어야 하기 때문이다.
 *
 * 운영시간·주변 장소·인기 도서 데이터를 새로 모았으면 다시 돌린다.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const load = require('./lib/load-app-ts.cjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'src/data/chat-ideas.generated.json');
const checkOnly = process.argv.includes('--check');

const { ask } = load('src/utils/assistant.ts');
const { candidateIdeas, ideaText } = load('src/utils/chatIdeas.ts');
const { MOCK_LIBRARIES } = load('src/data/libraries.mock.ts');
const { translate } = load('src/i18n/index.ts');

const LANGS = ['ko', 'en', 'ja', 'zh'];
const libById = new Map(MOCK_LIBRARIES.map((l) => [l.id, l]));
const NEARBY_TYPE = { cafe: 'cafe', food: 'restaurant', culture: 'culture' };

/** 이 칩을 눌렀을 때 나와야 하는 답인가. 아니면 까닭을 돌려준다 */
function judge(idea, answer, lang) {
  const text = answer.text ?? '';
  if (text.startsWith(translate(lang, 'bot.notUnderstood', { q: '' }).slice(0, 3)) && text.includes(translate(lang, 'bot.help', { count: MOCK_LIBRARIES.length }).slice(0, 8))) {
    return '알아듣지 못함';
  }

  if (idea.id) {
    const lib = libById.get(idea.id);
    if (idea.k in NEARBY_TYPE) {
      const places = answer.places ?? [];
      if (places.length === 0) return `주변 장소가 안 나옴: ${text.slice(0, 40)}`;
      if (places.some((p) => p.libraryId !== lib.id)) return '다른 도서관 주변이 나옴';
      if (places.some((p) => p.type !== NEARBY_TYPE[idea.k])) return `다른 종류가 나옴(${places[0].type})`;
      return null;
    }
    const card = answer.libraries?.[0];
    if (!card || card.id !== lib.id) return `다른 도서관으로 답함(${card?.name ?? '없음'})`;
    switch (idea.k) {
      case 'hours':
        return text.includes(lib.hours.label) ? null : `운영시간이 안 나옴: ${text.slice(0, 40)}`;
      case 'closed':
        return text.includes(lib.closedDays) ? null : `휴관일이 안 나옴: ${text.slice(0, 40)}`;
      case 'phone':
        return text.includes(lib.phone) ? null : `전화번호가 안 나옴: ${text.slice(0, 40)}`;
      case 'where':
        return text.includes(lib.address) ? null : `주소가 안 나옴: ${text.slice(0, 40)}`;
      case 'books':
        return (answer.books ?? []).length > 0 ? null : `책이 안 나옴: ${text.slice(0, 40)}`;
      default:
        return `모르는 종류 ${idea.k}`;
    }
  }

  if (idea.k === 'open') {
    // 밤에는 문 연 곳이 없을 수 있다. 목록으로 답했거나 "찾지 못했어요" 면 맞게 알아들은 것이다.
    return answer.libraries || answer.suggestions ? null : `목록으로 답하지 않음: ${text.slice(0, 40)}`;
  }

  const libs = answer.libraries ?? [];
  if (libs.length === 0) return `목록이 비었음: ${text.slice(0, 40)}`;
  if (idea.c && libs.some((l) => l.categories[0] !== idea.c)) return `다른 주제가 섞임: ${text.slice(0, 40)}`;
  if (idea.s && libs.some((l) => l.region.sido !== idea.s)) return `다른 지역이 섞임: ${text.slice(0, 40)}`;
  return null;
}

const candidates = candidateIdeas();
const passed = [];
const failures = new Map();

for (const idea of candidates) {
  let ok = true;
  for (const lang of LANGS) {
    const q = ideaText(idea, lang);
    if (!q) {
      ok = false;
      failures.set(`${idea.k} ${lang}`, [...(failures.get(`${idea.k} ${lang}`) ?? []), '문장을 못 만듦']);
      break;
    }
    const why = judge(idea, await ask(q, lang), lang);
    if (why) {
      ok = false;
      const key = `${idea.k} ${lang}`;
      failures.set(key, [...(failures.get(key) ?? []), `"${q}" → ${why}`]);
      break;
    }
  }
  if (ok) passed.push(idea);
}

const byKind = (list) =>
  Object.entries(list.reduce((m, i) => ((m[i.k] = (m[i.k] ?? 0) + 1), m), {}))
    .map(([k, n]) => `${k} ${n}`)
    .join(' · ');

console.log(`후보 ${candidates.length}개 → 통과 ${passed.length}개`);
console.log(`  통과: ${byKind(passed)}`);
if (failures.size) {
  console.log(`\n탈락 (종류·언어별, 앞의 3개만):`);
  for (const [key, list] of failures) {
    console.log(`  ${key}: ${list.length}개`);
    for (const line of list.slice(0, 3)) console.log(`    ${line}`);
  }
}

if (checkOnly) {
  const current = JSON.parse(fs.readFileSync(OUT, 'utf8')).ideas ?? [];
  const passKeys = new Set(passed.map((i) => JSON.stringify(i)));
  const stale = current.filter((i) => !passKeys.has(JSON.stringify(i)));
  if (stale.length) {
    console.log(`\n✗ 앱 목록에 지금은 통과하지 못하는 칩이 ${stale.length}개 있다. npm run chat-ideas 로 다시 만든다.`);
    process.exit(1);
  }
  console.log(`\n✓ 앱 목록 ${current.length}개 모두 지금도 통과`);
} else {
  fs.writeFileSync(
    OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), ideas: passed }, null, 0).replace(
      /\},\{/g,
      '},\n{'
    ) + '\n'
  );
  console.log(`\n→ ${path.relative(root, OUT)} 에 ${passed.length}개를 적었다`);
}
