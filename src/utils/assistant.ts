import { CATEGORIES, SIDO_LIST } from '@/data/categories';
import { MOCK_LIBRARIES } from '@/data/libraries.mock';
import { booksForLibrary } from '@/data/books.mock';
import { nearbyApi } from '@/api/nearbyApi';
import { isOpenNow, todayHoursLabel } from './openingHours';
import { regionName, translate, type Lang, type MessageKey } from '@/i18n';
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

/** 문장 틀에 끼워 넣는 값들 */
type Vars = Record<string, string | number>;

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

/**
 * 주제를 가리키는 말들. 분류 이름만으로는 안 잡히는 표현을 넉넉히 넣는다.
 *
 * 한국어 뒤에 영어·일본어·중국어를 이어 붙였다. 한 줄에 네 말을 모아 두면
 * 주제를 하나 고칠 때 네 군데를 돌아다니지 않아도 되고, 어느 말에서
 * 빠뜨렸는지도 눈에 바로 띈다.
 *
 * 영어 낱말에는 \b 를 붙인다. 안 붙이면 art 가 start·heart 에도 걸린다.
 * 복수형도 같이 받는다(cafes, books).
 */
const CATEGORY_WORDS: [CategoryId, RegExp][] = [
  ['kids', /어린이|아이|애들|유아|그림책|동화|청소년|키즈|\bkids?\b|\bchildren\b|\bchild\b|こども|子ども|児童|絵本|儿童|童书|绘本/],
  ['language', /영어|어학|외국어|원서|\blanguages?\b|\benglish\b|\bforeign\b|語学|英語|外国語|语言|英语|外语/],
  ['music', /음악|국악|lp|음반|악기|\bmusic\b|\brecords?\b|音楽|レコード|音乐|唱片/],
  ['art', /예술|미술|디자인|전시|그림|\bart\b|\bdesign\b|\bexhibitions?\b|芸術|美術|デザイン|艺术|美术|设计/],
  ['history', /역사|전통|한옥|유적|\bhistory\b|\bheritage\b|歴史|伝統|历史|传统/],
  ['nature', /자연|환경|생태|숲|식물|정원|\bnature\b|\beco\b|\bforests?\b|\bplants?\b|\bgardens?\b|自然|森|植物|生态|花园/],
  ['science', /과학|아이티|it|디지털|ai|인공지능|천문|우주|로봇|정보과학|\bscience\b|\btech\b|\brobots?\b|\bspace\b|科学|宇宙|ロボット|太空|机器人/],
  ['comics', /만화|웹툰|영화|영상|미디어|\bcomics?\b|\bcartoons?\b|\bwebtoons?\b|\bmovies?\b|\bfilms?\b|マンガ|漫画|映画|动漫|电影/],
  ['food', /미식|요리|식문화|음식 도서관|\bcooking\b|\bcuisine\b|\bgastronomy\b|グルメ|料理|美食|烹饪/],
  ['travel', /여행|바다|해양|관광|바닷|\btravel\b|\bocean\b|\bsea\b|\btourism\b|旅行|海洋|旅游/],
  ['humanities', /인문|철학|문학|사회|법률|정치|다문화|\bhumanities\b|\bphilosophy\b|\bliterature\b|人文|哲学|文学|哲學/],
  ['landmark', /랜드마크|대표 도서관|큰 도서관|\blandmarks?\b|ランドマーク|地标|代表/],
];

/**
 * 지역을 가리키는 말. 씨앗의 sido 는 충청·경상·전라로 묶여 있다.
 *
 * 로마자 표기를 같이 넣었다. 외국인은 "Busan" 이라고 치지 "부산" 이라고
 * 치지 않는다. 한자·가타카나도 마찬가지다.
 */
const SIDO_WORDS: [string, RegExp][] = [
  ['서울', /서울|\bseoul\b|ソウル|首尔|首爾/],
  ['경기', /경기|수원|성남|고양|화성|판교|\bgyeonggi\b|京畿/],
  ['인천', /인천|송도|영종|청라|\bincheon\b|インチョン|仁川/],
  ['강원', /강원|춘천|원주|강릉|속초|\bgangwon\b|江原/],
  ['대전', /대전|\bdaejeon\b|大田/],
  ['세종', /세종|\bsejong\b|世宗/],
  ['충청', /충청|충북|충남|청주|천안|아산|충주|\bchungcheong\b|忠清|忠淸/],
  ['전라', /전라|전북|전남|전주|순천|목포|여수|\bjeolla\b|全羅|全罗/],
  ['광주', /광주|\bgwangju\b|光州/],
  ['경상', /경상|경북|경남|경주|포항|진주|창원|\bgyeongsang\b|慶尚|庆尚/],
  ['대구', /대구|\bdaegu\b|大邱/],
  ['울산', /울산|\bulsan\b|蔚山/],
  ['부산', /부산|해운대|\bbusan\b|プサン|釜山/],
  ['제주', /제주|\bjeju\b|チェジュ|済州|济州/],
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

/** 주변에서 무엇을 찾는지. 셋째 칸은 문장에 넣을 이름의 열쇠다. */
const NEARBY_WORDS: [NearbyType, RegExp, MessageKey][] = [
  ['cafe', /카페|커피|찻집|\bcafes?\b|\bcoffee\b|カフェ|コーヒー|咖啡/, 'bot.kindCafe'],
  [
    'restaurant',
    /맛집|밥|식당|먹을|음식점|점심|저녁|\brestaurants?\b|\bfood\b|\beat\b|\blunch\b|\bdinner\b|グルメ|食事|レストラン|美食|餐厅|吃饭/,
    'bot.kindFood',
  ],
  [
    'culture',
    /볼거리|문화|구경|가볼|명소|전시관|\bculture\b|\bsights?\b|\bmuseums?\b|\bgallery\b|文化|見どころ|景点|博物馆/,
    'bot.kindCulture',
  ],
];

/**
 * 무엇을 묻는지 알아보는 말들.
 *
 * ⚠️ 순서가 겹치지 않게 갈라 두었다. '닫는다(close)' 를 운영시간 쪽에
 *   넣으면 "언제 쉬어요" 가 휴관일로 못 가고 운영시간으로 빨려 든다.
 *   그래서 운영시간은 '열다·시간' 쪽만, 휴관일은 '닫다·쉬다' 쪽만 본다.
 */
const ASK = {
  hours: /시간|몇시|몇 시|여니|열어|영업|운영|\bhours?\b|\bopening\b|\bwhat time\b|時間|開館|开放时间|营业|几点/,
  phone: /전화|연락|번호|\bphone\b|\bcall\b|\bnumber\b|電話|电话/,
  closedDays: /휴관|쉬는|쉬어|문 닫|\bclosed\b|\bholidays?\b|\bday off\b|休館|闭馆|休息日/,
  where: /어디|위치|주소|가는|찾아|\bwhere\b|\baddress\b|\blocation\b|どこ|住所|場所|地址|位置|在哪/,
  // '도서' 는 '도서관' 안에도 들어 있다. 뒤에 '관' 이 오면 건물 이름이다.
  books: /책|대출|인기|빌린|읽을|도서(?!관)|\bbooks?\b|\bborrowed?\b|\bpopular\b|\bread\b|貸出|人気|人気の本|借阅|热门|图书(?!馆)/,
  openNow:
    /지금|현재|열려|문 연|운영중|영업중|今開|いま開|営業中|現在開|开放中|正在开|现在开|(\bopen\b[^.?!]*\bnow\b)|(\bnow\b[^.?!]*\bopen\b)|(\bcurrently\b[^.?!]*\bopen\b)/,
  wantsList:
    /추천|알려|찾아|보여|어디|있어|없어|목록|곳|\brecommend\b|\bshow\b|\bfind\b|\blists?\b|\bany\b|\bsuggest\b|おすすめ|教えて|探して|推荐|推薦|查找|有哪些/,
  greeting: /^(안녕|하이|헬로|반가|hi\b|hello\b|hey\b|こんにちは|やあ|你好|您好)/,
  thanks: /고마워|고맙|감사|\bthanks\b|\bthank you\b|ありがとう|谢谢/,
  help: /뭐 할 수|뭘 할 수|도움말|사용법|기능|\bhelp\b|\bwhat can you\b|使い方|ヘルプ|帮助|使用方法|你能做/,
} as const;

/* ── 답 만들기 ────────────────────────────────────────────── */

const listNames = (libs: Library[]) => libs.map((l) => l.name).join(', ');

/** 도서관 목록을 몇 곳까지 카드로 보여줄지 */
const MAX_CARDS = 5;

function pick(libs: Library[]) {
  return libs.slice(0, MAX_CARDS);
}

/** 특정 도서관에 대한 질문에 답한다. */
async function answerAboutLibrary(lib: Library, q: string, lang: Lang): Promise<Answer> {
  const text = norm(q);
  const cards = [lib];
  const tr = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);

  /**
   * 이름을 넣을 때 쓰는 값들.
   *
   * nameTopic 은 한국어 문장에만 쓰인다. "서울도서관은 / 강북도서관은"
   * 처럼 받침에 따라 조사가 갈리므로 여기서 미리 붙여 넘긴다.
   * 다른 말의 문장은 {name} 만 쓰므로 남는 값은 그냥 버려진다.
   */
  const who: Vars = { name: lib.name, nameTopic: josa(lib.name, '은는') };

  // 주변 장소
  for (const [type, re, kindKey] of NEARBY_WORDS) {
    if (re.test(text)) {
      if (!lib.coords) {
        return { text: tr('bot.noCoords', who), libraries: cards };
      }
      const places = await nearbyApi.list(lib.id, lib.coords, type);
      const kind = tr(kindKey);
      if (places.length === 0) {
        return {
          // 한국어는 "맛집이 / 카페가" 로 갈리므로 조사를 붙여 넘긴다
          text: tr('bot.nearbyNone', { ...who, kind, kindSubj: josa(kind, '이가') }),
          libraries: cards,
        };
      }
      return {
        text: tr('bot.nearbyFound', { ...who, kind, n: places.length }),
        places: places.slice(0, 5),
        suggestions: [tr('bot.sugHours', who), tr('bot.sugBooks', who)],
      };
    }
  }

  // 운영시간
  if (ASK.hours.test(text)) {
    if (!lib.hours) {
      return {
        text:
          tr('bot.hoursUnknown', who) +
          (lib.phone ? tr('bot.phoneLine', { phone: lib.phone }) : ''),
        libraries: cards,
      };
    }
    const open = isOpenNow(lib.hours);
    const state = open === null ? '' : open ? tr('bot.openYes') : tr('bot.openNo');
    // todayHoursLabel 이 이미 "오늘 09:00 - 21:00" 형태로 돌려준다
    return {
      text:
        tr('bot.hoursMain', { ...who, label: lib.hours.label }) +
        state +
        '\n' +
        todayHoursLabel(lib.hours, lang) +
        (lib.closedDays ? tr('bot.closedLine', { days: lib.closedDays }) : ''),
      libraries: cards,
    };
  }

  // 전화
  if (ASK.phone.test(text)) {
    return {
      text: lib.phone
        ? tr('bot.phoneIs', { ...who, phone: lib.phone })
        : tr('bot.phoneUnknown', who),
      libraries: cards,
    };
  }

  // 휴관일
  if (ASK.closedDays.test(text)) {
    return {
      text: lib.closedDays
        ? tr('bot.closedIs', { ...who, days: lib.closedDays })
        : tr('bot.closedUnknown', who),
      libraries: cards,
    };
  }

  // 위치
  if (ASK.where.test(text)) {
    return {
      text: lib.address
        ? tr('bot.addressIs', { ...who, address: lib.address })
        : tr('bot.addressUnknown', who),
      libraries: cards,
      suggestions: [tr('bot.sugCafe', who), tr('bot.sugHours', who)],
    };
  }

  // 인기 도서
  if (ASK.books.test(text)) {
    const books = booksForLibrary(lib.id, lib.categories);
    if (books.length === 0 || !books[0].rank) {
      return { text: tr('bot.booksNone', who), libraries: cards };
    }
    return {
      text:
        books[0].rankScope === 'region'
          ? tr('bot.booksRegion', {
              where: regionName(lang, books[0].rankRegion ?? lib.region.sido),
            })
          : tr('bot.booksLibrary', who),
      books: books.slice(0, 5),
      libraries: cards,
    };
  }

  // 그 밖의 질문은 아는 것을 요약해 준다
  const bits = [
    tr('bot.sumFocus', {
      sido: regionName(lang, lib.region.sido),
      specialty: lib.specialty,
    }),
  ];
  if (lib.address) bits.push(tr('bot.sumAddress', { address: lib.address }));
  if (lib.hours) bits.push(tr('bot.sumHours', { label: lib.hours.label }));
  else bits.push(tr('bot.sumHoursUnknown'));

  return {
    text: bits.join('\n'),
    libraries: cards,
    suggestions: [tr('bot.sugFood', who), tr('bot.sugBooks', who), tr('bot.sugHours', who)],
  };
}

/** 조건에 맞는 도서관을 골라 준다. */
function answerBrowse(q: string, lang: Lang, category?: CategoryId, sido?: string): Answer {
  const text = norm(q);
  const tr = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
  const openOnly = ASK.openNow.test(text);

  let libs = MOCK_LIBRARIES;
  if (category) libs = libs.filter((l) => l.categories[0] === category);
  if (sido) libs = libs.filter((l) => l.region.sido === sido);
  if (openOnly) libs = libs.filter((l) => isOpenNow(l.hours) === true);

  /*
   * "서울 어린이 도서관" 같은 이름을 만든다.
   *
   * 말마다 어순이 다르다 — 한국어는 "서울 어린이 도서관", 영어는
   * "kids libraries in Seoul" 이다. 그래서 조각을 이어 붙이지 않고
   * 경우마다 문장 틀을 따로 둔다.
   * 지역 이름(서울·경기…)은 옮기지 않는다. 주소에 적힌 원문이다.
   */
  const cat = category ? translate(lang, `cat.${category}`) : undefined;
  const where = sido ? regionName(lang, sido) : undefined;
  const label =
    where && cat
      ? tr('bot.labelBoth', { sido: where, cat })
      : cat
        ? tr('bot.labelCat', { cat })
        : where
          ? tr('bot.labelSido', { sido: where })
          : tr('bot.labelAny');

  if (libs.length === 0) {
    // 왜 없는지까지 말해 준다. "없어요" 만으로는 앱이 고장 난 것처럼 보인다.
    const reason = openOnly ? tr('bot.browseNoneOpen') : '';
    return {
      text: tr('bot.browseNone', { label, labelTopic: josa(label, '은는') }) + reason,
      suggestions: [tr('bot.sugKids'), tr('bot.sugSeoul'), tr('bot.sugOpen')],
    };
  }

  const head = openOnly
    ? tr('bot.browseHeadOpen', { label, n: libs.length })
    : tr('bot.browseHead', { label, n: libs.length });
  const tail = libs.length > MAX_CARDS ? tr('bot.browseTail', { n: MAX_CARDS }) : '';

  return {
    text: head + tail,
    libraries: pick(libs),
    suggestions: cat
      ? [tr('bot.sugCatSido', { cat }), tr('bot.sugOpen')]
      : [tr('bot.sugKids'), tr('bot.sugMusic'), tr('bot.sugOpen')],
  };
}

/**
 * 질문 하나에 답한다.
 *
 * 순서가 중요하다. 도서관 이름이 들어 있으면 그 도서관 이야기로 본다.
 * "부산도서관 주변 카페" 에서 '부산'을 지역으로 먼저 잡아 버리면
 * 부산 전체 목록을 내놓게 된다.
 */
export async function ask(question: string, lang: Lang = 'ko'): Promise<Answer> {
  const tr = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
  const q = question.trim();
  if (!q) return { text: tr('bot.help') };
  const text = norm(q);

  if (ASK.greeting.test(text)) {
    return {
      text: tr('bot.hello'),
      suggestions: [tr('bot.sugKids'), tr('bot.sugOpen'), tr('bot.sugSeoul')],
    };
  }
  if (ASK.thanks.test(text)) {
    return { text: tr('bot.thanks') };
  }
  if (ASK.help.test(text)) {
    return { text: tr('bot.help') };
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
    const answer = answerBrowse(q, lang, findCategory(q), findSido(q));
    const exact = MOCK_LIBRARIES.find((l) => norm(l.name) === `${sidoWord}도서관`);
    if (exact) {
      answer.suggestions = [
        tr('bot.sugHours', { name: exact.name }),
        ...(answer.suggestions ?? []),
      ].slice(0, 3);
    }
    return answer;
  }

  const lib = findLibrary(q);
  if (lib) return answerAboutLibrary(lib, q, lang);

  // 도서관을 지목하지 않고 "근처 카페" 만 물으면 어디 기준인지 알 수 없다
  if (NEARBY_WORDS.some(([, re]) => re.test(text)) && !findCategory(q)) {
    return {
      text: tr('bot.needLibrary'),
      suggestions: [tr('bot.sugSeoulCafe'), tr('bot.sugBusanFood')],
    };
  }

  const category = findCategory(q);
  const sido = findSido(q);

  if (category || sido || ASK.openNow.test(text) || ASK.wantsList.test(text)) {
    return answerBrowse(q, lang, category, sido);
  }

  return {
    text: `${tr('bot.notUnderstood', { q })}\n\n${tr('bot.help')}`,
    suggestions: [tr('bot.sugKids'), tr('bot.sugOpen')],
  };
}

/**
 * 처음 화면에 띄울 예시 질문.
 *
 * 눌리면 그대로 질문으로 들어가므로, 달곰이가 알아듣는 말이어야 한다.
 * 도서관 이름은 어느 말에서든 한글 그대로다 — 이름을 옮기면 찾지 못한다.
 */
export function starterQuestions(lang: Lang): string[] {
  const tr = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
  return [
    tr('bot.sugKids'),
    tr('bot.sugOpen'),
    tr('bot.sugHours', { name: '서울도서관' }),
    tr('bot.sugCafe', { name: '한밭도서관' }),
  ];
}

/** 개발 중 상태 확인용 */
export const assistantScope = {
  libraryCount: MOCK_LIBRARIES.length,
  namesForMatching: listNames,
};
