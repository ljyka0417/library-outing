import { CATEGORIES, CATEGORY_MAP, SIDO_LIST } from '@/data/categories';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { booksForLibrary } from '@/data/books.mock';
import { nearbyApi } from '@/api/nearbyApi';
import { isOpenNow, todayHoursLabel } from './openingHours';
import type { Book, CategoryId, Library, NearbyPlace, NearbyType } from '@/types';

/**
 * 달곰이 도우미.
 *
 * 앱이 이미 가진 데이터로만 답한다. 바깥 AI 를 부르지 않는다.
 * 그래서 서버도 API 키도 요금도 없고, 비행기 모드에서도 답한다.
 *
 * **모르는 건 모른다고 말한다.**
 *   운영시간을 확인한 곳은 132곳 중 72곳뿐이다. 나머지는 비워 두는 것이
 *   이 앱의 원칙이고, 도우미도 같은 원칙을 따른다. 그럴듯한 시간을 지어내면
 *   사람이 헛걸음한다. 화면에서 조용히 숨기던 것을 말로 지어내면 더 나쁘다.
 *
 * 답은 문장 + 근거 데이터로 이루어진다. 도서관을 말할 땐 카드도 같이 돌려주므로
 * 사람은 문장을 안 믿어도 카드를 눌러 직접 확인할 수 있다.
 */

export interface Answer {
  text: string;
  libraries?: Library[];
  books?: Book[];
  places?: NearbyPlace[];
  /** 이어서 물어볼 만한 것들 */
  suggestions?: string[];
}

/* ── 말 알아듣기 ──────────────────────────────────────────── */

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * 조사를 앞말에 맞춰 고른다. "서울도서관은(는)" 같은 표기를 없애기 위한 것.
 *
 * 한글 음절은 0xAC00 부터 28개 종성 단위로 배열되어 있어서,
 * (코드 - 0xAC00) % 28 이 0 이 아니면 받침이 있다.
 * 한글이 아닌 글자로 끝나면(영문·숫자) 받침 없는 쪽을 쓴다.
 */
function josa(word: string, pair: '은는' | '이가' | '을를' | '과와' | '이에요예요') {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinal = hangul && (code - 0xac00) % 28 !== 0;

  const table: Record<string, [string, string]> = {
    은는: ['은', '는'],
    이가: ['이', '가'],
    을를: ['을', '를'],
    과와: ['과', '와'],
    이에요예요: ['이에요', '예요'],
  };
  const [withFinal, without] = table[pair];
  return `${word}${hasFinal ? withFinal : without}`;
}

/** 주제를 가리키는 말들. 분류 이름만으로는 안 잡히는 표현을 넉넉히 넣는다. */
const CATEGORY_WORDS: [CategoryId, RegExp][] = [
  ['kids', /어린이|아이|애들|유아|그림책|동화|청소년|키즈/],
  ['language', /영어|어학|외국어|원서/],
  ['music', /음악|국악|lp|음반|악기/],
  ['art', /예술|미술|디자인|전시|그림/],
  ['history', /역사|전통|한옥|유적/],
  ['nature', /자연|환경|생태|숲|식물|정원/],
  ['science', /과학|아이티|it|디지털|ai|인공지능|천문|우주|로봇|정보과학/],
  ['comics', /만화|웹툰|영화|영상|미디어/],
  ['food', /미식|요리|식문화|음식 도서관/],
  ['travel', /여행|바다|해양|관광|바닷/],
  ['humanities', /인문|철학|문학|사회|법률|정치|다문화/],
  ['landmark', /랜드마크|대표 도서관|큰 도서관/],
];

/** 지역을 가리키는 말. 씨앗의 sido 는 충청·경상·전라로 묶여 있다. */
const SIDO_WORDS: [string, RegExp][] = [
  ['서울', /서울/],
  ['경기', /경기|수원|성남|고양|화성|판교/],
  ['인천', /인천|송도|영종|청라/],
  ['강원', /강원|춘천|원주|강릉|속초/],
  ['대전', /대전/],
  ['세종', /세종/],
  ['충청', /충청|충북|충남|청주|천안|아산|충주/],
  ['전라', /전라|전북|전남|전주|순천|목포|여수/],
  ['광주', /광주/],
  ['경상', /경상|경북|경남|경주|포항|진주|창원/],
  ['대구', /대구/],
  ['울산', /울산/],
  ['부산', /부산|해운대/],
  ['제주', /제주/],
];

/** 이름 앞에 붙는 지역명. 사람들은 이걸 떼고 부르는 일이 잦다 */
const REGION_PREFIX =
  /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|충청|전라|경상)/;

/**
 * 이름으로 도서관을 찾는다.
 *
 * "종갓집" 처럼 일부만 말해도 찾아야 하므로 '도서관'·'시립' 같은 흔한 말을
 * 떼어 낸 키도 함께 본다. 여럿 걸리면 가장 긴 키가 걸린 곳을 고른다
 * ("어린이도서관" 은 여러 곳에 걸리지만 "송파어린이영어" 는 한 곳이다).
 */
function findLibrary(q: string): Library | undefined {
  const spaced = norm(q);
  const tight = spaced.replace(/\s/g, '');

  /**
   * 띄어쓴 그대로 먼저 찾고, 못 찾으면 공백을 없애고 다시 찾는다.
   *
   * 순서가 뜻을 가른다. "부산 도서관 알려줘" 는 부산에 있는 도서관들을 묻는
   * 말이지 「부산도서관」 한 곳을 묻는 게 아니다. 처음부터 공백을 지우면
   * 둘을 구별할 수 없어 엉뚱한 한 곳만 답하게 된다.
   * 반대로 "울산종갓집도서관에서" 처럼 붙여 쓴 말은 두 번째에서 잡힌다.
   */
  const scan = (text: string) => {
    let best: { lib: Library; len: number } | undefined;
    for (const lib of MOCK_LIBRARIES) {
      const full = norm(lib.name);
      const tightName = full.replace(/\s/g, '');
      const keys = [full];

      // '시립'·'도서관' 같은 흔한 꼬리를 뗀 이름 ("울산종갓집")
      const noTail = tightName.replace(/(시립|도립|군립|구립|공립)?도서관$/, '');
      // 짧은 이름이 지역 이름이면 쓰지 않는다. 「부산도서관」의 짧은 이름은
      // '부산' 인데, 그러면 부산을 말하기만 해도 그 한 곳으로 잡혀 버린다.
      if (noTail.length >= 3 && !SIDO_LIST.some((s) => norm(s) === noTail)) {
        keys.push(noTail);
      }

      // 앞의 지역명을 떼고 부르는 경우 ("울산종갓집도서관" → "종갓집도서관")
      const noPrefix = tightName.replace(REGION_PREFIX, '');
      if (noPrefix !== tightName && noPrefix.length >= 4 && noPrefix !== '도서관') {
        keys.push(noPrefix);
      }

      for (const key of keys) {
        if (key.length >= 2 && text.includes(key)) {
          if (!best || key.length > best.len) best = { lib, len: key.length };
        }
      }
    }
    return best?.lib;
  };

  return scan(spaced) ?? scan(tight);
}

function findCategory(q: string): CategoryId | undefined {
  const text = norm(q);
  for (const [id, re] of CATEGORY_WORDS) if (re.test(text)) return id;
  // 분류 이름 자체로 물어본 경우 ("역사 도서관")
  for (const c of CATEGORIES) if (text.includes(norm(c.name))) return c.id;
  return undefined;
}

function findSido(q: string): string | undefined {
  const text = norm(q);
  for (const [sido, re] of SIDO_WORDS) if (re.test(text)) return sido;
  return SIDO_LIST.find((s) => text.includes(norm(s)));
}

const NEARBY_WORDS: [NearbyType, RegExp, string][] = [
  ['cafe', /카페|커피|찻집/, '카페'],
  ['restaurant', /맛집|밥|식당|먹을|음식점|점심|저녁/, '맛집'],
  ['culture', /볼거리|문화|구경|가볼|명소|전시관/, '문화·볼거리'],
];

/* ── 답 만들기 ────────────────────────────────────────────── */

const listNames = (libs: Library[]) => libs.map((l) => l.name).join(', ');

/** 도서관 목록을 몇 곳까지 카드로 보여줄지 */
const MAX_CARDS = 5;

function pick(libs: Library[]) {
  return libs.slice(0, MAX_CARDS);
}

/** 특정 도서관에 대한 질문에 답한다. */
async function answerAboutLibrary(lib: Library, q: string): Promise<Answer> {
  const text = norm(q);
  const cards = [lib];

  // 주변 장소
  for (const [type, re, label] of NEARBY_WORDS) {
    if (re.test(text)) {
      if (!lib.coords) {
        return {
          text: `${josa(lib.name, '은는')} 아직 좌표를 확인하지 못해서 주변을 찾아드릴 수 없어요.`,
          libraries: cards,
        };
      }
      const places = await nearbyApi.list(lib.id, lib.coords, type);
      if (places.length === 0) {
        return {
          text: `${lib.name} 주변에서 찾은 ${label}가 아직 없어요.`,
          libraries: cards,
        };
      }
      return {
        text: `${lib.name} 주변 ${label} ${places.length}곳이에요. 가까운 순서예요.`,
        places: places.slice(0, 5),
        suggestions: [`${lib.name} 운영시간`, `${lib.name} 인기 도서`],
      };
    }
  }

  // 운영시간
  if (/시간|몇시|몇 시|여니|열어|닫|영업|운영/.test(text)) {
    if (!lib.hours) {
      return {
        text: `${lib.name}의 운영시간은 아직 확인하지 못했어요. 확인되지 않은 시간을 알려드리면 헛걸음하실 수 있어서 비워 두고 있어요. 전화로 확인하시는 게 가장 정확해요.${
          lib.phone ? `\n전화: ${lib.phone}` : ''
        }`,
        libraries: cards,
      };
    }
    const open = isOpenNow(lib.hours);
    const state = open === null ? '' : open ? ' 지금은 열려 있어요.' : ' 지금은 운영시간이 아니에요.';
    // todayHoursLabel 이 이미 "오늘 09:00 - 21:00" 형태로 돌려준다
    return {
      text: `${josa(lib.name, '은는')} ${lib.hours.label}.${state}\n${todayHoursLabel(lib.hours)}${
        lib.closedDays ? `\n휴관일: ${lib.closedDays}` : ''
      }`,
      libraries: cards,
    };
  }

  // 전화
  if (/전화|연락|번호/.test(text)) {
    return {
      text: lib.phone
        ? `${lib.name} 전화번호는 ${lib.phone}이에요.`
        : `${lib.name}의 전화번호는 아직 확인하지 못했어요.`,
      libraries: cards,
    };
  }

  // 휴관일
  if (/휴관|쉬는|쉬어|문 닫/.test(text)) {
    return {
      text: lib.closedDays
        ? `${lib.name} 휴관일은 ${lib.closedDays}이에요.`
        : `${lib.name}의 휴관일은 아직 확인하지 못했어요.`,
      libraries: cards,
    };
  }

  // 위치
  if (/어디|위치|주소|가는|찾아/.test(text)) {
    return {
      text: lib.address
        ? `${josa(lib.name, '은는')} ${lib.address}에 있어요. 카드를 누르면 지도앱으로 바로 열 수 있어요.`
        : `${lib.name}의 주소는 아직 확인하지 못했어요.`,
      libraries: cards,
      suggestions: [`${lib.name} 주변 카페`, `${lib.name} 운영시간`],
    };
  }

  // 인기 도서.
  // '도서' 는 '도서관' 안에도 들어 있다. 뒤에 '관' 이 오면 그건 건물 이름이지
  // 책 이야기가 아니다. 이걸 빠뜨려서 "부산 도서관 알려줘" 가 대출 순위로 빠졌다.
  if (/책|대출|인기|빌린|읽을|도서(?!관)/.test(text)) {
    const books = booksForLibrary(lib.id, lib.categories);
    if (books.length === 0 || !books[0].rank) {
      return {
        text: `${lib.name}의 대출 순위는 아직 없어요. 정보나루에 등록되지 않은 도서관이라 대출 데이터를 받아올 수 없어요.`,
        libraries: cards,
      };
    }
    const where =
      books[0].rankScope === 'region'
        ? `${books[0].rankRegion ?? lib.region.sido} 지역에서`
        : `${lib.name}에서`;
    return {
      text: `${where} 많이 빌린 책이에요.`,
      books: books.slice(0, 5),
      libraries: cards,
    };
  }

  // 그 밖의 질문은 아는 것을 요약해 준다
  const bits = [`${lib.region.sido} · ${lib.specialty} 특화 도서관이에요.`];
  if (lib.address) bits.push(`주소는 ${lib.address}.`);
  if (lib.hours) bits.push(`운영시간은 ${lib.hours.label}.`);
  else bits.push('운영시간은 아직 확인 중이에요.');

  return {
    text: bits.join('\n'),
    libraries: cards,
    suggestions: [`${lib.name} 주변 맛집`, `${lib.name} 인기 도서`, `${lib.name} 운영시간`],
  };
}

/** 조건에 맞는 도서관을 골라 준다. */
function answerBrowse(q: string, category?: CategoryId, sido?: string): Answer {
  const text = norm(q);
  const openOnly = /지금|현재|열려|문 연|운영중|영업중/.test(text);

  let libs = MOCK_LIBRARIES;
  if (category) libs = libs.filter((l) => l.categories[0] === category);
  if (sido) libs = libs.filter((l) => l.region.sido === sido);
  if (openOnly) libs = libs.filter((l) => isOpenNow(l.hours) === true);

  const what = [
    sido,
    category ? CATEGORY_MAP[category]?.name : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const label = what ? `${what} 도서관` : '도서관';

  if (libs.length === 0) {
    // 왜 없는지까지 말해 준다. "없어요" 만으로는 앱이 고장 난 것처럼 보인다.
    const reason = openOnly
      ? '\n운영시간을 확인한 곳이 132곳 중 72곳이라, 나머지는 지금 열려 있는지 판단할 수 없어 빠져 있어요.'
      : '';
    return {
      text: `${josa(label, '은는')} 찾지 못했어요.${reason}`,
      suggestions: ['어린이 도서관 추천해줘', '서울 도서관', '지금 문 연 도서관'],
    };
  }

  const head = openOnly
    ? `지금 열려 있는 ${label} ${libs.length}곳이에요.`
    : `${label} ${libs.length}곳이 있어요.`;
  const tail =
    libs.length > MAX_CARDS ? `\n그중 ${MAX_CARDS}곳을 먼저 보여드릴게요.` : '';

  return {
    text: head + tail,
    libraries: pick(libs),
    suggestions: category
      ? [`${CATEGORY_MAP[category]?.name} 도서관 서울`, '지금 문 연 도서관']
      : ['어린이 도서관 추천해줘', '음악 도서관', '지금 문 연 도서관'],
  };
}

const HELP = `저는 이 앱에 담긴 132곳 정보로만 답해요. 이런 걸 물어보세요.

· 어린이 도서관 추천해줘
· 부산에 있는 도서관
· 지금 문 연 도서관
· 서울도서관 몇 시까지 해?
· 한밭도서관 주변 카페
· 울산종갓집도서관에서 많이 빌린 책

모르는 건 지어내지 않고 모른다고 말할게요.`;

/**
 * 질문 하나에 답한다.
 *
 * 순서가 중요하다. 도서관 이름이 들어 있으면 그 도서관 이야기로 본다.
 * "부산도서관 주변 카페" 에서 '부산'을 지역으로 먼저 잡아 버리면
 * 부산 전체 목록을 내놓게 된다.
 */
export async function ask(question: string): Promise<Answer> {
  const q = question.trim();
  if (!q) return { text: HELP };
  const text = norm(q);

  if (/^(안녕|하이|헬로|반가)/.test(text)) {
    return {
      text: '안녕하세요, 달곰이예요. 전국 도서관 132곳을 알고 있어요. 무엇을 찾아드릴까요?',
      suggestions: ['어린이 도서관 추천해줘', '지금 문 연 도서관', '서울 도서관'],
    };
  }
  if (/고마워|고맙|감사/.test(text)) {
    return { text: '천만에요! 또 궁금한 게 있으면 물어보세요.' };
  }
  if (/뭐 할 수|뭘 할 수|도움말|사용법|기능/.test(text)) {
    return { text: HELP };
  }

  /**
   * "부산 도서관" 처럼 지역 이름 뒤에 띄어 쓴 '도서관' 은 뜻이 둘이다.
   * 부산에 있는 도서관들일 수도, 「부산도서관」 한 곳일 수도 있다.
   *
   * 목록 쪽으로 답한다. 한 곳만 보여 주면 나머지를 통째로 빠뜨리지만,
   * 목록을 보여 주면 그 한 곳도 대개 목록 안에 있다. 대신 그 도서관을
   * 가리키는 칩을 같이 놓아 한 번 눌러 건너갈 수 있게 한다.
   */
  const regionThenLibrary = new RegExp(
    `(${SIDO_WORDS.map(([s]) => s).join('|')})\\s+도서관`
  ).exec(text);

  if (regionThenLibrary) {
    const sidoWord = regionThenLibrary[1];
    const answer = answerBrowse(q, findCategory(q), findSido(q));
    const exact = MOCK_LIBRARIES.find((l) => norm(l.name) === `${sidoWord}도서관`);
    if (exact) {
      answer.suggestions = [`${exact.name} 운영시간`, ...(answer.suggestions ?? [])].slice(0, 3);
    }
    return answer;
  }

  const lib = findLibrary(q);
  if (lib) return answerAboutLibrary(lib, q);

  // 도서관을 지목하지 않고 "근처 카페" 만 물으면 어디 기준인지 알 수 없다
  if (NEARBY_WORDS.some(([, re]) => re.test(text)) && !findCategory(q)) {
    return {
      text: '어느 도서관 주변인지 알려주시면 찾아드릴게요. "한밭도서관 주변 카페" 처럼요.',
      suggestions: ['서울도서관 주변 카페', '부산도서관 주변 맛집'],
    };
  }

  const category = findCategory(q);
  const sido = findSido(q);
  const openOnly = /지금|열려|문 연|운영중|영업중/.test(text);
  const wantsList = /추천|알려|찾아|보여|어디|있어|없어|목록|곳/.test(text);

  if (category || sido || openOnly || wantsList) {
    return answerBrowse(q, category, sido);
  }

  return {
    text: `"${q}" 는 제가 아직 이해하지 못했어요.\n\n${HELP}`,
    suggestions: ['어린이 도서관 추천해줘', '지금 문 연 도서관'],
  };
}

/** 처음 화면에 띄울 예시 질문 */
export const STARTER_QUESTIONS = [
  '어린이 도서관 추천해줘',
  '지금 문 연 도서관',
  '서울도서관 몇 시까지 해?',
  '한밭도서관 주변 카페',
];

/** 개발 중 상태 확인용 */
export const assistantScope = {
  libraryCount: MOCK_LIBRARIES.length,
  namesForMatching: listNames,
};
