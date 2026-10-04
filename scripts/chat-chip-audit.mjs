/**
 * 달곰이 추천 칩이 한 주제에 갇히지 않는지 검사한다.
 *
 *   npm run chat-chips
 *
 * 「질문 A 를 하면 다음 칩이 A 갈래로만 채워지는」 버그를 막는다. 네 가지를 본다.
 *   1. 검사를 통과한 칩 전부를 네 말로 물었을 때 — 다음 칩 다섯 중 같은 종류·같은 도서관은 둘까지,
 *      방금 물은 질문은 다시 권하지 않는다, 칩은 늘 다섯
 *   2. 같은 질문을 열 번 물으면 칩이 매번 달라지는가 (고정되면 안 된다)
 *   3. 칩을 서른 번 이어 누르는 대화 — 한 주제에 갇히지 않는가
 *   4. 칩이 아닌 질문(인사·고마워·시간·못 알아듣는 말 …)
 * 네트워크(대출·날씨·미세먼지·행사)는 꾸민 답으로 돌린다 — 칩 섞기만 본다. 문제가 있으면 1 로 끝난다.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const load = require('./lib/load-app-ts.cjs');
// 네트워크는 빠르게 꾸민다 (칩 섞기만 본다)
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('/where?')) { const libs = new URL(u).searchParams.get('libs')?.split(',') ?? []; return new Response(JSON.stringify({ results: Object.fromEntries(libs.map((c) => [c, { hasBook: true, loanAvailable: true }])) })); }
  if (u.includes('/related?')) return new Response(JSON.stringify({ books: [{ title: '검사', author: '', isbns: ['9780000000002'] }] }));
  if (u.includes('/culture?')) return new Response(JSON.stringify({ events: [{ seq: '1', title: '전시', kind: 'exhibit', start: '2026-10-01', end: '2026-10-30', place: '어딘가', lat: 37.56, lng: 126.97, dist: 300 }] }));
  if (u.includes('/air')) return new Response(JSON.stringify({ station: '중구', pm10: 20, pm25: 10, pm10Grade: 1, pm25Grade: 1, dataTime: '2026-10-04 12:00' }));
  return new Response('{}', { status: 503 });
};
const { ask } = load('src/utils/assistant.ts');
const { ideaText } = load('src/utils/chatIdeas.ts');
const { translate } = load('src/i18n/index.ts');
const verified = require('../src/data/chat-ideas.generated.json').ideas;
const LANGS = ['ko', 'en', 'ja', 'zh'];
const ME = ['who', 'job', 'mbti', 'hobby', 'talent', 'likes', 'dislikes', 'bag', 'profile'];
const sq = (s) => s.toLowerCase().replace(/\s+/g, '');

// 칩 글자 → 종류
const kindOf = {}; const libOf = {};
for (const lang of LANGS) {
  for (const i of verified) { const t = ideaText(i, lang); if (t) { kindOf[lang + sq(t)] = i.k; if (i.id) libOf[lang + sq(t)] = i.id; } }
  for (const k of ME) kindOf[lang + sq(translate(lang, `me.sug.${k}`))] = 'me';
}
const kind = (lang, t) => kindOf[lang + sq(t)] ?? 'fixed:' + t; // 목록 밖 고정 문구는 그 글자 자체를 종류로

const problems = [];
const check = (lang, q, qKind, qLib, a, tag) => {
  const s = a.suggestions ?? [];
  if (a.keepSuggestions) return;
  if (s.length < 5) problems.push(`${tag} 칩 ${s.length}개: ${q}`);
  if (s.some((x) => sq(x) === sq(q))) problems.push(`${tag} 방금 질문이 다시 권해짐: ${q}`);
  const byKind = {}; for (const x of s) { const k = kind(lang, x); byKind[k] = (byKind[k] ?? 0) + 1; }
  for (const [k, n] of Object.entries(byKind)) if (n > 2) problems.push(`${tag} 같은 종류 ${k} ×${n}: ${q} → ${s.join(' | ')}`);
  const byLib = {}; for (const x of s) { const l = libOf[lang + sq(x)]; if (l) byLib[l] = (byLib[l] ?? 0) + 1; }
  for (const [l, n] of Object.entries(byLib)) if (n > 2) problems.push(`${tag} 같은 도서관 ${l} ×${n}: ${q}`);
  if (qKind && (byKind[qKind] ?? 0) > 2) problems.push(`${tag} 물은 종류(${qKind})가 ${byKind[qKind]}개: ${q}`);
};

// 1) 칩 전부 × 4개 언어
let n = 0;
for (const idea of verified) for (const lang of LANGS) {
  const q = ideaText(idea, lang); if (!q) continue;
  const a = await ask(q, lang, { seed: (n * 7919) >>> 0, avoid: [] }); n++;
  check(lang, q, idea.k, idea.id, a, `[1 ${lang}]`);
}
// 달곰이 질문도
for (const lang of LANGS) for (const k of ME) { const q = translate(lang, `me.sug.${k}`); check(lang, q, 'me', null, await ask(q, lang, { seed: k.length * 31 }), `[1 ${lang} me]`); }
console.log('1) 물어본 칩', n);

// 2) 같은 질문 10번 → 칩이 매번 같은가
let fixedCount = 0; const sample = verified.filter((_, i) => i % 25 === 0);
for (const idea of sample) for (const lang of LANGS) {
  const q = ideaText(idea, lang); if (!q) continue;
  const sets = new Set();
  for (let s = 1; s <= 10; s++) sets.add((await ask(q, lang, { seed: s * 104729 })).suggestions.join('|'));
  if (sets.size <= 2) { fixedCount++; problems.push(`[2 ${lang}] 10번 물어도 칩이 ${sets.size}가지뿐: ${q}`); }
}
console.log('2) 반복 질문 검사', sample.length * 4, '개 · 고정', fixedCount);

// 3) 칩을 30번 따라 누르는 대화 20개 × 4개 언어
for (const lang of LANGS) for (let c = 0; c < 20; c++) {
  let q = ideaText(verified[(c * 53) % verified.length], lang); const asked = []; const kinds = new Set();
  for (let step = 0; step < 30; step++) {
    const a = await ask(q, lang, { seed: (c * 1000 + step * 17 + 3) >>> 0, avoid: asked });
    check(lang, q, kind(lang, q), null, a, `[3 ${lang}]`);
    asked.push(q); kinds.add(kind(lang, q));
    const s = (a.suggestions ?? []).filter((x) => !asked.includes(x));
    if (!s.length) { problems.push(`[3 ${lang}] 칩이 바닥남 (${step}번째)`); break; }
    q = s[(c + step) % s.length];
  }
  if (kinds.size < 8) problems.push(`[3 ${lang}] 대화 ${c}: 30번 중 종류 ${kinds.size}가지뿐`);
}
console.log('3) 이어 누르기 대화 80개 × 30번');

// 4) 칩이 아닌 질문
const FREE = { ko: ['안녕', '고마워', '뭐 할 수 있어?', '지금 몇 시야?', '아무말이나', '근처 카페', '소년이 온다 빌릴 수 있어?', '휠체어'], en: ['hello', 'thanks', 'help', 'what time is it', 'asdf', 'cafes nearby', 'where can I borrow 소년이 온다', 'wheelchair'], ja: ['こんにちは', 'ありがとう', '使い方', '今何時', 'ほげ', 'カフェ', '소년이 온다を借りたい', '車いす'], zh: ['你好', '谢谢', '帮助', '现在几点', '随便', '咖啡', '在哪里能借소년이 온다', '轮椅'] };
for (const [lang, qs] of Object.entries(FREE)) for (const q of qs) for (let s = 1; s <= 3; s++) check(lang, q, null, null, await ask(q, lang, { seed: s * 7 }), `[4 ${lang}]`);
console.log('4) 일반 질문', Object.values(FREE).flat().length * 3);

console.log(`\n문제 ${problems.length}건`);
const groups = {}; for (const p of problems) { const k = p.replace(/:.*$/, ''); (groups[k] ??= []).push(p); }
for (const [k, list] of Object.entries(groups)) { console.log(`- ${k}: ${list.length}건`); for (const p of list.slice(0, 3)) console.log('    ' + p.slice(0, 220)); }
if (problems.length) process.exit(1);
