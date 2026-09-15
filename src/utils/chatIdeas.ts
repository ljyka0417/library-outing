import { CATEGORIES, SIDO_LIST } from '@/data/categories';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { booksForLibrary } from '@/data/books.mock';
import { hasNearby } from '@/api/nearbyApi';
import { regionName, translate, type Lang, type MessageKey } from '@/i18n';
import type { CategoryId, Library } from '@/types';
import verifiedJson from '@/data/chat-ideas.generated.json';

/**
 * 달곰이 추천 문구 (말풍선 아래 눌러 물어보는 칩).
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 이렇게 두 단계인가
 * ─────────────────────────────────────────────────────────────
 * 칩을 누르면 그 글자가 그대로 질문으로 들어간다. 그러니 **권한 문구에는
 * 반드시 제대로 된 답이 나와야 한다.** "○○도서관 휴관일" 을 권해 놓고
 * "아직 확인하지 못했어요" 가 나오거나, 도서관 이름에 든 '문화' 때문에
 * 엉뚱하게 주변 볼거리가 나오면 칩이 거짓말을 한 셈이다.
 *
 *   1. candidateIdeas()  데이터에서 권할 만한 것을 모두 뽑는다
 *                        (운영시간이 있는 곳만 운영시간을, 주변 카페가 있는 곳만 카페를…)
 *   2. npm run chat-ideas  그 전부를 실제 달곰이에게 네 가지 말로 물어보고,
 *                        기대한 답이 나온 것만 chat-ideas.generated.json 에 적는다
 *
 * 앱은 적힌 것만 권한다. 데이터를 바꾸면(운영시간 추가, 도서관 추가) 다시 돌린다.
 *
 * ─────────────────────────────────────────────────────────────
 * 복구 장치
 * ─────────────────────────────────────────────────────────────
 * 목록 파일이 비었거나, 모양이 이상하거나, 고르다가 무엇이든 실패하면
 * 예전의 고정 문구(어린이 도서관 추천 · 지금 문 연 도서관 …)로 돌아간다.
 * 칩이 이상하게 나오는 일은 있어도 대화 화면이 멈추는 일은 없게 한다.
 */

export type IdeaKind =
  | 'hours'
  | 'closed'
  | 'phone'
  | 'where'
  | 'books'
  | 'cafe'
  | 'food'
  | 'culture'
  | 'category'
  | 'region'
  | 'regionCategory'
  | 'open';

export interface Idea {
  k: IdeaKind;
  /** 도서관에 대한 칩 */
  id?: string;
  /** 주제 칩 */
  c?: CategoryId;
  /** 지역 칩 (한국어 원문) */
  s?: string;
}

const LIBRARY_KINDS: IdeaKind[] = ['hours', 'closed', 'phone', 'where', 'books', 'cafe', 'food', 'culture'];

const libById = new Map(MOCK_LIBRARIES.map((l) => [l.id, l]));

/* ── 1. 후보 ──────────────────────────────────────────────── */

function libraryHas(lib: Library, kind: IdeaKind): boolean {
  switch (kind) {
    case 'hours':
      return !!lib.hours;
    case 'closed':
      return !!lib.closedDays;
    case 'phone':
      return !!lib.phone;
    case 'where':
      return !!lib.address;
    case 'books': {
      const books = booksForLibrary(lib.id, lib.categories);
      return books.length > 0 && !!books[0].rank;
    }
    case 'cafe':
      return !!lib.coords && hasNearby(lib.id, 'cafe');
    case 'food':
      return !!lib.coords && hasNearby(lib.id, 'restaurant');
    case 'culture':
      return !!lib.coords && hasNearby(lib.id, 'culture');
    default:
      return false;
  }
}

/** 데이터로 보아 권할 수 있는 것 전부. 검사 스크립트가 이걸 하나하나 물어본다 */
export function candidateIdeas(): Idea[] {
  const out: Idea[] = [{ k: 'open' }];

  for (const lib of MOCK_LIBRARIES) {
    for (const k of LIBRARY_KINDS) if (libraryHas(lib, k)) out.push({ k, id: lib.id });
  }

  // 달곰이는 주제를 대표 주제(categories[0])로 거른다. 같은 기준으로 센다.
  const count = (c?: CategoryId, s?: string) =>
    MOCK_LIBRARIES.filter(
      (l) => (!c || l.categories[0] === c) && (!s || l.region.sido === s)
    ).length;

  for (const c of CATEGORIES) if (count(c.id) > 0) out.push({ k: 'category', c: c.id });
  for (const s of SIDO_LIST) if (count(undefined, s) > 0) out.push({ k: 'region', s });
  // 한 곳뿐인 조합은 목록이라 하기 어색해서 두 곳 이상만
  for (const s of SIDO_LIST) {
    for (const c of CATEGORIES) if (count(c.id, s) >= 2) out.push({ k: 'regionCategory', c: c.id, s });
  }
  return out;
}

/* ── 글자로 ───────────────────────────────────────────────── */

const LIBRARY_TEXT: Record<string, MessageKey> = {
  hours: 'bot.sugHours',
  closed: 'bot.sugClosed',
  phone: 'bot.sugPhone',
  where: 'bot.sugWhere',
  books: 'bot.sugBooks',
  cafe: 'bot.sugCafe',
  food: 'bot.sugFood',
  culture: 'bot.sugCulture',
};

/** 칩에 적을 문장. 도서관 이름은 어느 말에서든 한글 그대로다 — 옮기면 달곰이가 못 찾는다 */
export function ideaText(idea: Idea, lang: Lang): string | undefined {
  const tr = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(lang, key, vars);

  if (idea.id) {
    const lib = libById.get(idea.id);
    const key = LIBRARY_TEXT[idea.k];
    return lib && key ? tr(key, { name: lib.name }) : undefined;
  }
  const cat = idea.c ? tr(`cat.${idea.c}` as MessageKey) : undefined;
  const sido = idea.s ? regionName(lang, idea.s) : undefined;
  switch (idea.k) {
    case 'open':
      return tr('bot.sugOpen');
    case 'category':
      // 영어는 문장 가운데라 소문자로 ("Recommend kids libraries"). 달곰이는 대소문자를 가리지 않는다.
      return cat ? tr('bot.sugCat', { cat: lang === 'en' ? cat.toLowerCase() : cat }) : undefined;
    case 'region':
      return sido ? tr('bot.sugSido', { sido }) : undefined;
    case 'regionCategory':
      return cat && sido ? tr('bot.sugSidoCat', { cat, sido }) : undefined;
    default:
      return undefined;
  }
}

/* ── 2. 검사를 통과한 것 ─────────────────────────────────── */

const isIdea = (x: unknown): x is Idea =>
  !!x && typeof x === 'object' && typeof (x as Idea).k === 'string';

/**
 * 검사를 통과한 목록. 도서관이 목록에서 빠졌으면 그 칩도 뺀다.
 * 파일이 망가져 있으면 빈 목록 → 부르는 쪽이 예전 고정 문구로 돌아간다.
 */
const VERIFIED: Idea[] = (() => {
  try {
    const list = (verifiedJson as unknown as { ideas?: unknown }).ideas;
    if (!Array.isArray(list)) return [];
    return list.filter(isIdea).filter((i) => !i.id || libById.has(i.id));
  } catch {
    return [];
  }
})();

export const chatIdeasStatus = {
  verified: VERIFIED.length,
  generatedAt: (verifiedJson as unknown as { generatedAt?: string | null }).generatedAt ?? null,
};

/* ── 고르기 ───────────────────────────────────────────────── */

/**
 * 고를 때 쓰는 것들.
 *
 *   seed   섞는 씨앗. **질문할 때마다 새로 뽑아 대화에 적어 둔다**(chat.tsx).
 *          처음엔 질문 글자로 씨앗을 만들었는데, 그러면 같은 칩을 누를 때마다
 *          똑같은 칩이 다시 나와 "랜덤이 아니라 계속 중복" 이었다.
 *          대화에 적어 두므로 언어를 바꿔 다시 답할 때는 같은 칩이 그 말로 바뀐다.
 *   avoid  이 대화에서 이미 물어본 질문들. 그 칩은 다시 권하지 않는다.
 */
export interface PickContext {
  lang: Lang;
  seed: number;
  avoid?: string[];
}

/**
 * 칩은 늘 이만큼. 처음 네 개였다가 답할수록 두세 개로 줄던 것을 맞춘다.
 * 다섯: 방금 이야기와 이어지는 둘 + 다른 추천 셋 (아래 compose)
 */
export const CHIP_COUNT = 5;

/** 씨앗으로 섞는다 (mulberry32). 같은 씨앗이면 같은 순서다 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 글자에서 씨앗을 만든다. 씨앗을 받지 못했을 때(검사 스크립트 등)만 쓴다 */
export function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffled<T>(items: T[], seed: number): T[] {
  const r = rng(seed);
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/**
 * 조건에 맞는 것 중에서 n 개를 고른다.
 *
 * 같은 종류·같은 도서관·같은 주제·같은 지역이 겹치지 않게 한다. ("○○ 운영시간 /
 * △△ 운영시간", "경기 어린이 도서관 / 어린이 도서관 추천해줘" 처럼 비슷한 것이
 * 나란히 서면 다양해 보이지 않는다) 이미 물어본 질문과 같은 글자도 뺀다.
 */
function pick(
  ctx: PickContext,
  filter: (i: Idea) => boolean,
  n: number,
  salt: number,
  taken: Idea[] = [],
  /** 한 도서관에 대해 여러 가지를 물을 때는 같은 도서관이 겹쳐야 한다 */
  sameLibraryOk = false
): Idea[] {
  const avoid = new Set((ctx.avoid ?? []).map(squash));
  const out: Idea[] = [];
  const kinds = new Set(taken.map((i) => i.k));
  const libs = new Set(taken.map((i) => i.id).filter(Boolean));
  const cats = new Set(taken.map((i) => i.c).filter(Boolean));
  const sidos = new Set(taken.map((i) => i.s).filter(Boolean));

  for (const idea of shuffled(VERIFIED.filter(filter), ctx.seed + salt)) {
    if (out.length >= n) break;
    if (kinds.has(idea.k)) continue;
    if (idea.id && libs.has(idea.id) && !sameLibraryOk) continue;
    if (idea.c && cats.has(idea.c)) continue;
    if (idea.s && sidos.has(idea.s)) continue;
    const text = ideaText(idea, ctx.lang);
    if (!text || avoid.has(squash(text))) continue;

    out.push(idea);
    kinds.add(idea.k);
    if (idea.id) libs.add(idea.id);
    if (idea.c) cats.add(idea.c);
    if (idea.s) sidos.add(idea.s);
  }
  return out;
}

const texts = (ideas: Idea[], lang: Lang) =>
  ideas.map((i) => ideaText(i, lang)).filter((t): t is string => !!t);

/**
 * 모자라면 채운다.
 *
 * 한 도서관에 대해 물을 거리를 다 물었거나, 이미 물어본 것을 빼고 나면 넷이 안 될 때가
 * 있다(재 보니 도서관 답 뒤의 13% 가 두세 개였다). 그때는 겹침 규칙을 풀고
 * prefer(같은 주제의 다른 도서관 등) → 아무거나 순서로, 글자가 겹치지 않게 넷까지 채운다.
 */
function fillTo(ctx: PickContext, chosen: Idea[], prefer: (i: Idea) => boolean, salt: number): Idea[] {
  if (chosen.length >= CHIP_COUNT) return chosen.slice(0, CHIP_COUNT);
  const avoid = new Set((ctx.avoid ?? []).map(squash));
  const seen = new Set(chosen.map((i) => squash(ideaText(i, ctx.lang) ?? '')));
  const out = chosen.slice();
  for (const pool of [VERIFIED.filter(prefer), VERIFIED]) {
    for (const idea of shuffled(pool, ctx.seed + salt)) {
      if (out.length >= CHIP_COUNT) return out;
      const text = ideaText(idea, ctx.lang);
      if (!text) continue;
      const key = squash(text);
      if (avoid.has(key) || seen.has(key)) continue;
      out.push(idea);
      seen.add(key);
    }
  }
  return out;
}

/**
 * 실패하면 예전 문구로 (복구 장치). 칩 몇 개 때문에 대화 화면이 멈추면 안 된다.
 * 예전 문구에서도 이미 물어본 것은 뺀다.
 */
function safely(
  ctx: PickContext,
  make: () => string[],
  fallback: () => string[],
  min = 2
): string[] {
  const avoid = new Set((ctx.avoid ?? []).map(squash));
  // 겹친 글자는 한 번만, 다섯까지
  const fromFallback = () =>
    [...new Set(fallback())].filter((t) => !avoid.has(squash(t))).slice(0, CHIP_COUNT);
  try {
    const out = make();
    return out.length >= min ? out : fromFallback();
  } catch {
    return fromFallback();
  }
}

const isLibraryIdea = (i: Idea) => !!i.id;
const isBrowseIdea = (i: Idea) => !i.id;
const isNearbyIdea = (i: Idea) => i.k === 'cafe' || i.k === 'food' || i.k === 'culture';

/*
 * ─────────────────────────────────────────────────────────────
 * 칩 다섯 개의 모양
 * ─────────────────────────────────────────────────────────────
 *   방금 물은 것과 이어지는 칩 RELATED 개  +  전혀 다른 추천 나머지
 *
 *   「서울도서관 운영시간」 → 서울도서관 휴관일 · 서울도서관 주변 카페   (이어지는 둘)
 *                           부산 음악 도서관 · 한밭도서관 인기 도서 · … (다른 셋)
 *
 * 이어지는 것만 권하면 한 도서관에 갇히고, 다른 것만 권하면 방금 이야기가 끊긴다.
 * 다른 셋은 둘러보기와 다른 도서관 이야기를 섞되, 몇 대 몇으로 섞을지도 씨앗으로 정한다.
 */
const RELATED = 2;

/** 전혀 다른 추천 n 개. 둘러보기 1~2개 + 나머지는 다른 도서관 이야기 */
function others(ctx: PickContext, taken: Idea[], n: number, salt: number): Idea[] {
  const browseCount = Math.min(n, rng(ctx.seed + salt)() < 0.5 ? 1 : 2);
  const b = pick(ctx, isBrowseIdea, browseCount, salt + 1, taken);
  const l = pick(ctx, isLibraryIdea, n - b.length, salt + 2, [...taken, ...b]);
  return [...b, ...l];
}

/** 이어지는 칩(related) 뒤에 다른 추천을 붙이고, 모자라면 다섯까지 채운다 */
function compose(ctx: PickContext, related: Idea[], salt: number): string[] {
  const head = related.slice(0, RELATED);
  const rest = others(ctx, head, CHIP_COUNT - head.length, salt);
  return texts(fillTo(ctx, [...head, ...rest], () => true, salt + 9), ctx.lang);
}

/** 처음 화면. 둘러보기 둘 + 도서관 이야기 셋 */
export function starterIdeas(ctx: PickContext, fallback: () => string[]): string[] {
  return safely(
    ctx,
    () => {
      const browse = pick(ctx, isBrowseIdea, 2, 31);
      const lib = pick(ctx, isLibraryIdea, CHIP_COUNT - browse.length, 37, browse);
      return texts(fillTo(ctx, [...browse, ...lib], () => true, 39), ctx.lang);
    },
    fallback
  );
}

/**
 * 도서관 하나를 답한 뒤.
 * 그 도서관에 대해 방금 물은 것 말고 둘 + 다른 추천 셋.
 * 그 도서관에 더 물을 것이 없으면 같은 주제의 다른 도서관 이야기로 이어 간다.
 */
export function libraryFollowUps(
  ctx: PickContext,
  libraryId: string,
  askedKind: IdeaKind | undefined,
  fallback: () => string[]
): string[] {
  return safely(
    ctx,
    () => {
      const lib = libById.get(libraryId);
      const cat = lib?.categories[0];
      let related = pick(ctx, (i) => i.id === libraryId && i.k !== askedKind, RELATED, 41, [], true);
      if (related.length < RELATED) {
        related = [
          ...related,
          ...pick(
            ctx,
            (i) => !!i.id && i.id !== libraryId && libById.get(i.id)?.categories[0] === cat,
            RELATED - related.length,
            43,
            related
          ),
        ];
      }
      return compose(ctx, related, 47);
    },
    fallback
  );
}

/**
 * 목록을 답한 뒤.
 * 이어지는 둘: 같은 주제의 다른 지역(주제를 물었을 때) 또는 주제 하나 + 방금 카드로 보여 준
 * 도서관 중 한 곳 이야기. 그다음 다른 추천 셋.
 */
export function browseFollowUps(
  ctx: PickContext,
  fallback: () => string[],
  category?: CategoryId,
  sido?: string,
  shownLibraryIds: string[] = []
): string[] {
  return safely(
    ctx,
    () => {
      const shown = new Set(shownLibraryIds);
      const wider = pick(
        ctx,
        (i) =>
          isBrowseIdea(i) &&
          (category
            ? i.c === category && !!i.s && i.s !== sido
            : sido
              ? i.s === sido && i.k === 'regionCategory'
              : i.k === 'category'),
        1,
        51
      );
      // 보여 준 도서관이 한두 곳뿐이면(세종 1곳) 같은 도서관 이야기 둘도 괜찮다
      const fromShown = pick(ctx, (i) => !!i.id && shown.has(i.id), RELATED - wider.length, 53, wider, true);
      return compose(ctx, [...wider, ...fromShown], 57);
    },
    fallback
  );
}

/** "근처 카페" 처럼 도서관을 안 말했을 때. 주변 정보가 있는 도서관 예시 둘 + 다른 추천 셋 */
export function nearbyExamples(ctx: PickContext, fallback: () => string[]): string[] {
  return safely(ctx, () => compose(ctx, pick(ctx, isNearbyIdea, RELATED, 61), 63), fallback);
}
