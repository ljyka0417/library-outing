import { CATEGORIES, SIDO_LIST } from '@/data/categories';
import { LIBRARY_COUNT, LIBRARY_HOURS_COUNT, MOCK_LIBRARIES } from '@/data/libraries.mock';
import { booksForLibrary } from '@/data/books.mock';
import { nearbyApi } from '@/api/nearbyApi';
import { formatDistance, isClosedToday, isOpenNow, todayHoursLabel, walkingMinutes } from './openingHours';
import { parkingFor } from '@/data/parking';
import { fetchNearbyEvents, isOngoing } from '@/api/culture';
import { AGE_KEYS, booksForAge, keywordItems, keywordMonth, type AgeKey, type GenderKey } from '@/data/trendBooks';
import { buddyTitle } from '@/data/buddy';
import { holidayName } from '@/data/holidays';
import { holidayText, libText, specialtyCategory } from '@/i18n/libraryText';
import { fetchWeather, weatherEnabled, weatherMood } from '@/api/weather';
import { airEnabled, airIsBad, fetchAir, stationName } from '@/api/air';
import { BF_GROUPS, barrierFreeFor, bfHas } from '@/data/barrierFree';
import { fetchRelated, fetchWhereToBorrow, loanLookupEnabled, searchBooks } from '@/api/loanStatus';
import { searchLocalBooks } from '@/data/bookIndex';
import { regionName, translate, type Lang, type MessageKey } from '@/i18n';
import {
  CHIP_COUNT,
  browseFollowUps,
  libraryFollowUps,
  nearbyExamples,
  seedFrom,
  starterIdeas,
  type IdeaKind,
  type PickContext,
} from './chatIdeas';
import type { Book, CategoryId, Library, NearbyPlace, NearbyType } from '@/types';

/**
 * 달곰이 도우미.
 *
 * 앱이 이미 가진 데이터로만 답한다. 바깥 AI 를 부르지 않는다.
 * 그래서 서버도 API 키도 요금도 없고, 비행기 모드에서도 답한다.
 *
 * **모르는 건 모른다고 말한다.**
 *   운영시간을 확인하지 못한 곳은 비워 두는 것이
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
  /** 주차장·공연·전시처럼 지도에서 열어 볼 곳 (이름 + 한 줄 설명) */
  spots?: Spot[];
  /** 오늘의 나들이 코스 짜기로 가는 단추 — libraryId 가 있으면 그 도서관에서 출발 */
  course?: { libraryId?: string };
  /** 이어서 물어볼 만한 것들 */
  suggestions?: string[];
  /** 칩이 곧 대답인 되물음("어느 지역에서 찾을까요?") — 섞지 않고 그대로 보여 준다 */
  keepSuggestions?: boolean;
}

export interface Spot {
  id: string;
  name: string;
  /** "공영 · 무료 · 도보 3분 (240m)" 같은 한 줄 */
  sub: string;
  coords: { lat: number; lng: number };
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
  ['nature', /자연|환경|생태|숲|식물|정원|\bnature\b|\beco\b|\bforests?\b|\bplants?\b|\bgardens?\b|自然|森|植物|生态|花园/],
  // it·ai 는 낱말로만 받는다. \b 없이 두었더니 "Humanities" 안의 it 에 걸려 인문을 과학으로 답했다.
  ['science', /과학|아이티|\bit\b|디지털|\bai\b|인공지능|천문|우주|로봇|정보과학|\bscience\b|\btech\b|\brobots?\b|\bspace\b|科学|宇宙|ロボット|太空|机器人/],
  // 책 분류에는 만화가 따로 없다. 만화·웹툰·영화 도서관은 책에서 미디어(상주 두드림)로 묶인다.
  ['media', /미디어|뉴미디어|영상|방송|신문|언론|만화|웹툰|영화|\bcomics?\b|\bcartoons?\b|\bwebtoons?\b|\bmovies?\b|\bfilms?\b|マンガ|漫画|映画|动漫|电影|\bmedia\b|\bbroadcast(ing)?\b|\bnews\b|メディア|映像|放送|媒体|新闻/],
  // "food libraries" 는 주변 맛집이 아니라 음식 도서관이다. 뒤에 library 가 오면 주제로 받는다.
  // 일본어 주제 이름은 '食' 한 글자라, 그것만으로는 食事(식사)와 섞이므로 '食の図書館' 꼴로 받는다.
  ['food', /미식|요리|식문화|음식 도서관|\bfood librar(y|ies)\b|\bcooking\b|\bcuisine\b|\bgastronomy\b|グルメ|料理|食の図書館|食図書館|食文化|美食|烹饪/],
  ['travel', /여행|바다|해양|관광|바닷|\btravel\b|\bocean\b|\bsea\b|\btourism\b|旅行|海洋|旅游/],
  // 책 분류에는 역사가 따로 없다. 역사·한옥 도서관은 책에서 인문으로 묶인다.
  ['humanities', /인문|철학|문학|사회|정치|다문화|역사|전통|한옥|유적|\bhumanities\b|\bphilosophy\b|\bliterature\b|\bhistory\b|\bheritage\b|人文|哲学|文学|哲學|歴史|伝統|历史|传统/],
  ['education', /교육|학습|\beducation(al)?\b|\blearning\b|教育|学習|学习/],
  ['law', /법률|법학|법원|판례|헌법|\blaws?\b|\blegal\b|法律|法学|法令/],
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

  const found = scan(spaced) ?? scan(tight);
  if (found) return found;

  /*
   * 우리가 아는 이름과 부르는 이름이 다를 때.
   *
   * "판교도서관 운영시간 몇시까지 해?" 가 「경기 도서관 11곳이 있어요」 로
   * 답했다. 목록에 있는 이름은 「판교어린이도서관」이라 위 검사에 안 걸리고,
   * 그다음 지역 찾기에서 '판교' 가 경기의 별명으로 잡혀 지역 목록이 나갔다.
   * 운영시간을 물었는데 도서관 열한 곳을 받은 셈이다.
   *
   * 그래서 "○○도서관" 이라고 부른 말에서 ○○ 만 떼어, 그 말로 시작하는
   * 도서관을 찾는다. **딱 한 곳일 때만** 받아들인다. 여럿이면 어느 쪽인지
   * 알 수 없으니 지역·분류 쪽 답에 맡긴다.
   */
  const called = /([가-힣a-z0-9]{2,})도서관/.exec(tight);
  if (!called) return undefined;

  const stem = called[1].replace(/(시립|도립|군립|구립|공립)$/, '');
  if (stem.length < 2) return undefined;

  // 지역 이름으로 부른 것은 지역 목록이 맞다 ("부산도서관" 은 이미 위에서 잡힌다)
  if (SIDO_LIST.some((s) => norm(s) === stem) || REGION_PREFIX.test(stem)) return undefined;

  const starts = MOCK_LIBRARIES.filter((l) => norm(l.name).replace(/\s/g, '').startsWith(stem));
  return starts.length === 1 ? starts[0] : undefined;
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
    /볼거리|문화|구경|가볼|명소|전시관|\bculture\b|\bsights?\b|\bthings to (see|do)\b|\bmuseums?\b|\bgallery\b|文化|見どころ|景点|博物馆/,
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
async function answerAboutLibrary(
  lib: Library,
  q: string,
  lang: Lang,
  ctx: PickContext
): Promise<Answer> {
  /*
   * 무엇을 묻는지는 도서관 이름을 뺀 나머지 말로 본다.
   *
   * 「농심식문화전문도서관 운영시간」이 "좌표가 없어 주변을 찾을 수 없어요" 로
   * 답했다. 이름 속 '문화' 가 주변 볼거리(문화)를 묻는 말로 잡혔기 때문이다.
   * 「달서가족문화도서관」도 같았다. 이름은 이미 도서관을 고르는 데 썼으니
   * 질문을 읽을 때는 지운다. (붙여 쓴 이름도 지운다)
   */
  const text = norm(q)
    .replace(norm(lib.name), ' ')
    .replace(norm(lib.name).replace(/\s/g, ''), ' ');
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

  /*
   * 이어 물을 칩. 방금 물은 것은 빼고 이 도서관에 대해 답할 수 있는 것 중에서 고른다
   * (chatIdeas 가 검사를 통과한 것만 준다). 목록을 못 쓰면 예전 고정 칩으로.
   */
  /*
   * 목록을 못 쓸 때의 칩(복구 장치). 예전엔 운영시간·전화 답 뒤의 복구 칩이 비어 있어서,
   * 목록이 비면 칩이 통째로 사라졌다. 이 도서관 이야기 + 둘러보기로 늘 채워 둔다.
   */
  const fixedChips = [
    tr('bot.sugHours', who),
    tr('bot.sugCafe', who),
    tr('bot.sugBooks', who),
    tr('bot.sugKids'),
    tr('bot.sugOpen'),
    tr('bot.sugSeoul'),
    tr('bot.sugMusic'),
  ];
  const more = (asked: IdeaKind | undefined, fallback: string[] = fixedChips) =>
    libraryFollowUps(ctx, lib.id, asked, () => [...fallback, ...fixedChips]);
  const walk = (m: number) => `${tr('nearby.walk', { n: walkingMinutes(m) })} (${formatDistance(m)})`;

  /*
   * 주차 — 전국주차장정보표준데이터에서 도서관 800m 안에 등록된 곳.
   * 운영시간보다 먼저 본다 ("주차 시간" 의 '시간' 이 운영시간으로 가지 않게).
   */
  if (ASK_PARKING.test(text)) {
    const lots = parkingFor(lib.id);
    if (lots.length === 0) return { text: tr('bot.parkingNone', who), libraries: cards, suggestions: more('parking') };
    return {
      text: tr('bot.parkingFound', { ...who, n: lots.length }),
      spots: lots.slice(0, 4).map((p, i) => ({
        id: `park-${lib.id}-${i}`,
        name: p.name,
        // 공영·무료 같은 낱말은 근처 주차장 칸과 같은 번역을 쓴다 (모르는 값은 뺀다)
        sub: [
          p.se === '공영' || p.se === '민영' ? tr(`park.se.${p.se}` as MessageKey) : undefined,
          p.fee === '무료' || p.fee === '유료' || p.fee === '혼합' ? tr(`park.fee.${p.fee}` as MessageKey) : undefined,
          p.spaces ? tr('park.spaces', { n: p.spaces }) : undefined,
          walk(p.distance),
        ]
          .filter(Boolean)
          .join(' · '),
        coords: p.coords,
      })),
      suggestions: more('parking'),
    };
  }

  /*
   * 근처 공연·전시 (한국문화정보원). 오늘 열려 있거나 곧 시작하는 것, 가까운 순.
   * '전시관'(주변 볼거리) 은 아래 주변 장소 쪽으로 간다.
   */
  if (ASK_EVENTS.test(text)) {
    if (!lib.coords) return { text: tr('bot.noCoords', who), libraries: cards };
    const events = await fetchNearbyEvents(lib.coords);
    if (!events) return { text: tr('bot.eventsFailed'), libraries: cards };
    if (events.length === 0) return { text: tr('bot.eventsNone', who), libraries: cards, suggestions: more('events') };
    const today = new Date().toISOString().slice(0, 10);
    const md = (d?: string) => (d ? `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}` : '');
    return {
      text: tr('bot.eventsFound', { ...who, n: events.length }),
      spots: events.slice(0, 5).map((e) => ({
        id: `ev-${e.seq}`,
        name: e.title,
        sub: [
          isOngoing(e, today) ? tr('bot.eventsNow') : undefined,
          e.start ? `${md(e.start)}–${md(e.end)}` : undefined,
          e.place,
          walk(e.dist),
        ]
          .filter(Boolean)
          .join(' · '),
        coords: { lat: e.lat, lng: e.lng },
      })),
      suggestions: more('events'),
    };
  }

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
        suggestions: more(type === 'restaurant' ? 'food' : type, [
          tr('bot.sugHours', who),
          tr('bot.sugBooks', who),
        ]),
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
        tr('bot.hoursMain', { ...who, label: libText(lib.hours.label, lang) }) +
        state +
        '\n' +
        todayHoursLabel(lib.hours, lang) +
        (lib.closedDays && !lib.hours.label.includes(lib.closedDays)
          ? tr('bot.closedLine', { days: libText(lib.closedDays, lang) })
          : ''),
      libraries: cards,
      suggestions: more('hours'),
    };
  }

  // 전화
  if (ASK.phone.test(text)) {
    return {
      text: lib.phone
        ? tr('bot.phoneIs', { ...who, phone: lib.phone })
        : tr('bot.phoneUnknown', who),
      libraries: cards,
      suggestions: more('phone'),
    };
  }

  // 휴관일
  if (ASK.closedDays.test(text)) {
    return {
      text: lib.closedDays
        ? tr('bot.closedIs', { ...who, days: libText(lib.closedDays, lang) })
        : tr('bot.closedUnknown', who),
      libraries: cards,
      suggestions: more('closed'),
    };
  }

  // 위치
  if (ASK.where.test(text)) {
    return {
      text: lib.address
        ? tr('bot.addressIs', { ...who, address: libText(lib.address, lang) })
        : tr('bot.addressUnknown', who),
      libraries: cards,
      suggestions: more('where', [tr('bot.sugCafe', who), tr('bot.sugHours', who)]),
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
      suggestions: more('books'),
    };
  }

  // 그 밖의 질문은 아는 것을 요약해 준다
  const bits = [
    tr('bot.sumFocus', {
      sido: regionName(lang, lib.region.sido),
      specialty: specialtyCategory(lib.specialty) ? tr(`cat.${specialtyCategory(lib.specialty)}` as MessageKey) : libText(lib.specialty, lang),
    }),
  ];
  if (lib.address) bits.push(tr('bot.sumAddress', { address: libText(lib.address, lang) }));
  if (lib.hours) bits.push(tr('bot.sumHours', { label: libText(lib.hours.label, lang) }));
  else bits.push(tr('bot.sumHoursUnknown'));

  return {
    text: bits.join('\n'),
    libraries: cards,
    suggestions: more(undefined, [
      tr('bot.sugFood', who),
      tr('bot.sugBooks', who),
      tr('bot.sugHours', who),
    ]),
  };
}

/** 조건에 맞는 도서관을 골라 준다. */
function answerBrowse(
  q: string,
  lang: Lang,
  ctx: PickContext,
  category?: CategoryId,
  sido?: string
): Answer {
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
    /*
     * 왜 없는지까지 말해 준다. "없어요" 만으로는 앱이 고장 난 것처럼 보인다.
     *
     * 단, 운영시간을 다 채운 뒤로는 "몇 곳 중 몇 곳뿐이라" 가 말이 안 된다.
     * 빠진 곳이 실제로 있을 때만 그 사정을 덧붙인다.
     */
    const someHoursMissing = LIBRARY_HOURS_COUNT < LIBRARY_COUNT;
    const reason =
      openOnly && someHoursMissing
        ? tr('bot.browseNoneOpen', { total: LIBRARY_COUNT, known: LIBRARY_HOURS_COUNT })
        : '';
    return {
      text: tr('bot.browseNone', { label, labelTopic: josa(label, '은는') }) + reason,
      suggestions: browseFollowUps(ctx, () => [
        tr('bot.sugKids'),
        tr('bot.sugSeoul'),
        tr('bot.sugOpen'),
      ]),
    };
  }

  const head = openOnly
    ? tr('bot.browseHeadOpen', { label, n: libs.length })
    : tr('bot.browseHead', { label, n: libs.length });
  const tail = libs.length > MAX_CARDS ? tr('bot.browseTail', { n: MAX_CARDS }) : '';

  return {
    text: head + tail,
    libraries: pick(libs),
    // 같은 주제의 다른 지역, 다른 주제 쪽으로 넓힌다
    suggestions: browseFollowUps(
      ctx,
      () =>
        cat
          ? [tr('bot.sugCatSido', { cat }), tr('bot.sugOpen')]
          : [tr('bot.sugKids'), tr('bot.sugMusic'), tr('bot.sugOpen')],
      category,
      sido,
      pick(libs).map((l) => l.id)
    ),
  };
}

/**
 * "지금 몇 시야?" — 도서관 운영시간("서울도서관 몇 시까지야?")과 헷갈리지 않게
 * "지금/현재"가 붙거나 "몇 시야"로 끝나는 꼴만 받고, 도서관 이야기가 섞이면 넘긴다.
 */
const ASK_TIME = /(지금|현재|오늘)\s*(몇\s*시|시간|시각)|몇\s*시야\s*\??$|몇\s*시\s*\??$|\bwhat time is it\b|\bcurrent time\b|今何時|いま何時|現在の時刻|现在几点|几点了|现在时间/;

/** 도서관 근처 주차 */
// 나들이 코스 — "서울도서관 코스 짜 줘" · "나들이 코스 추천"
const ASK_COURSE = /코스|나들이|데이트|하루\s*일정|\b(course|outing|itinerary|day trip)\b|コース|おでかけ|お出かけ|路线|行程|出行/;
const ASK_PARKING = /주차|\bparking\b|\bpark (my|the) car\b|駐車|停车/;

/** 근처 공연·전시 ('전시관' 은 주변 볼거리 쪽이라 뺀다) */
const ASK_EVENTS =
  /공연|전시(?!관)|행사|축제|연극|뮤지컬|콘서트|\bexhibitions?\b|\bshows\b|\bconcerts?\b|\bevents?\b|\bperformances?\b|\bfestivals?\b|展示|展覧会|公演|イベント|コンサート|展览|演出|演唱会|音乐会|活动/;

/** "오늘 어느 도서관 갈까?" */
const ASK_TODAY =
  /(어디|어느\s*도서관|무슨\s*도서관)\s*(갈까|가지|가면\s*좋|갈래|가볼까)|갈\s*만한\s*(도서관|곳)|\bwhere should (i|we) go\b|\bwhich library should (i|we)\b|\bwhere to go today\b|どこに行こう|どこへ行こう|どの図書館に行こう|どこ行こう|今天去哪|去哪(个|座|家)?图书馆|该去哪/;

/** 연령별 인기 책 — 책 이야기여야 한다 ("어린이 도서관 추천" 은 주제 둘러보기) */
// 중국어 '图书馆'(도서관) 안에도 '书' 가 있다 — 뒤에 '馆' 이 오면 건물 이름이다
const ASK_TREND_BOOK = /책|도서(?!관)|\bbooks?\b|本|书(?!馆)/;
const AGE_WORDS: Record<AgeKey, RegExp> = {
  kids: /유아|영유아|아기|\btoddlers?\b|\bbab(y|ies)\b|幼児|幼儿/,
  children: /어린이|초등|\bkids?\b|\bchildren\b|こども|子ども|子供|小学生|儿童/,
  teens: /청소년|10대|중학생|고등학생|\bteens?\b|\bteenagers?\b|中高生|10代|青少年/,
  '20s': /20대|\b20s\b|\btwenties\b|20代|20多岁|二十多岁/,
  '30s': /30대|\b30s\b|\bthirties\b|30代|30多岁|三十多岁/,
  '40s': /40대|\b40s\b|\bforties\b|40代|40多岁|四十多岁/,
  '50s': /50대|\b50s\b|\bfifties\b|50代|50多岁|五十多岁/,
  '60s': /60대|\b60s\b|\b60\+|\bseniors?\b|60代|60岁以上|老年/,
};
const FEMALE = /여성|여자|\bwom[ae]n\b|\bfemales?\b|女性|女生|女的/;
const MALE = /남성|남자|\bm[ae]n\b|\bmales?\b|男性|男生|男的/;

/** 이달의 키워드 (지난달) */
const ASK_KEYWORDS = /키워드|많이\s*찾은\s*(낱말|단어)|\bkeywords?\b|キーワード|关键词|关键字/;

/** 오늘 쉬는 도서관 */
const ASK_CLOSED_TODAY = /(오늘|금일)\s*(쉬는|휴관|문\s*닫)|\bclosed today\b|今日(は)?(休館|休み)|今天(闭馆|休馆|休息)/;

/** 내 방문 기록 */
const ASK_MY_VISITS =
  /몇\s*(곳|군데)\s*(다녀|가\s*봤|갔|방문)|방문\s*기록|다녀온\s*(곳|도서관)|\bhow many (libraries )?(have i|did i)\b|\bmy visits\b|何か所|訪問記録|行った図書館|我去过|去过(几|多少)|访问记录/;

/** 비슷한 책 (함께 빌린 책) */
const ASK_SIMILAR =
  /비슷한\s*(책|거|도서)|같이\s*빌린|함께\s*빌린|\bsimilar\b|\bbooks like\b|似た本|似ている本|一緒に借り|类似的书|相似的书|一起借/;
/** 비슷한 책 질문에서 제목만 남기려고 떼어 낼 말들 */
const SIMILAR_NOISE =
  /(이?랑|과|와|하고)?\s*비슷한\s*(책|거|도서)?|(같이|함께)\s*빌린\s*(책)?|추천\s*해\s*줘|추천해줘|추천|알려\s*줘|찾아\s*줘|있어|뭐\s*있어|\bsimilar( books)?( to)?\b|\bbooks? like\b|\bbooks?\b|\brecommend\b|\bsuggest\b|\bplease\b|\bany\b|に似た本|似た本|似ている本|を教えて|教えて|おすすめ|と一緒に借りた本|一緒に借りた本|和|跟|类似的书|相似的书|推荐|一起借的书|[?？!！.。'"“”‘’『』「」《》]/gi;

/** 휠체어·유모차·점자·수어 같은 편의를 묻는 말 */
const ASK_ACCESS = /휠체어|장애인|무장애|유모차|수유실|기저귀|엘리베이터|점자|수어|\bwheelchairs?\b|\baccessib(le|ility)\b|\bstrollers?\b|\bbraille\b|\bsign language\b|バリアフリー|車いす|車椅子|ベビーカー|点字|手話|无障碍|轮椅|婴儿车|盲文|手语/;

/** 날씨를 묻는 말 */
/** 미세먼지·공기 — 날씨보다 먼저 본다 */
const ASK_AIR = /미세\s*먼지|초미세|황사|공기\s*(질|어때|어떄|좋|나빠|나쁘|상태)|대기\s*(질|오염|상태)|\bair\s*quality\b|\bfine\s*dust\b|\bpm\s*(2\.?5|10)\b|\bdust\b|\bsmog\b|大気|黄砂|空気|PM2\.5|PM10|雾霾|空气质量|空气怎么样|微尘|粉尘/i;
const ASK_WEATHER = /날씨|기온|몇\s*도|비\s*(와|오|올)|눈\s*(와|오|올)|우산|\bweather\b|\btemperature\b|\brain(ing|y)?\b|天気|気温|雨|天气|气温|下雨/;

const WEEKDAYS: Record<Lang, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  zh: ['日', '一', '二', '三', '四', '五', '六'],
};
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 기기 시각을 그 언어에 맞게. Intl 은 기기마다 들쭉날쭉해서 직접 짠다 */
function formatNow(d: Date, lang: Lang): string {
  const M = d.getMonth() + 1, D = d.getDate(), h = d.getHours(), m = d.getMinutes();
  const mm = String(m).padStart(2, '0');
  const w = WEEKDAYS[lang][d.getDay()];
  if (lang === 'ko') return `${M}월 ${D}일 ${w}요일 ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시 ${m}분`;
  if (lang === 'en') return `${w}, ${MONTHS_EN[M - 1]} ${D}, ${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  if (lang === 'ja') return `${M}月${D}日(${w}) ${h}時${m}分`;
  return `${M}月${D}日 星期${w} ${h}:${mm}`;
}

/* ── 책 빌리기 ("소년이 온다 어디서 빌려?") ──────────────────── */

const ASK_BORROW =
  /어디서\s*빌|어디에서\s*빌|빌릴\s*수\s*있|빌려\s*(줘|요|볼|야|\?|$)|빌리고\s*싶|빌릴래|대출\s*가능|대출할\s*수|있는\s*도서관|소장(한|하는|하고\s*있는)\s*도서관|\bwhere can i (borrow|find|get)\b|\bborrow\b|借りられ|借りたい|在哪(里|儿)?(能|可以)?借|哪里(能|可以)借|能借到|可以借到?|借得到|能借吗/;

/** 책 제목만 남기려고 떼어 낼 말들 */
const BORROW_NOISE =
  /어디서|어디에서|어디|빌릴\s*수\s*있(어|나요|나|을까|을까요|는\s*곳|는\s*데)?|빌려\s*(줘|요|볼래|야)?|빌리고\s*싶(어|어요)?|빌릴래|대출\s*가능(해|한\s*곳|한\s*도서관)?|대출할\s*수\s*있(어|나)?|(있는|소장한|소장하는)\s*도서관|도서관|알려\s*줘|찾아\s*줘|좀|지금|책|\bwhere can i (borrow|find|get)\b|\bcan i (borrow|find|get)\b|\bborrow\b|\bthe book\b|借りられる(図書館)?|借りたい|どこで|在哪(里|儿)?(能|可以)?借|哪里(能|可以)借|能借到|可以借到?|借得到|能借|吗|[?？!！.。'"“”‘’『』「」《》]/gi;

/** 일본어·중국어로 쓴 지역 이름 (SIDO_WORDS 와 같은 낱말) */
const CJK_SIDO = 'ソウル|首尔|首爾|京畿|インチョン|仁川|江原|大田|世宗|忠清|忠淸|全羅|全罗|光州|慶尚|庆尚|大邱|蔚山|プサン|釜山|チェジュ|済州|济州';
const CJK_REGION_JA = new RegExp(`(${CJK_SIDO})\\s*(?:の図書館で|の図書館|で|にある)`);
const CJK_REGION_ZH = new RegExp(`(?:在\\s*(${CJK_SIDO})(?:的图书馆|地区)?|(${CJK_SIDO})(?:的图书馆|地区))`);

/** "소년이 온다를" → "소년이 온다" — 받침에 맞는 조사가 끝에 붙었을 때만 뗀다 */
function stripTrailingJosa(s: string): string {
  const m = /^(.*[가-힣])(을|를|은|는|이|가|도)$/.exec(s);
  if (!m || m[1].length < 2) return s;
  const code = m[1].charCodeAt(m[1].length - 1) - 0xac00;
  const hasBatchim = code % 28 !== 0;
  const ok = hasBatchim ? /^(을|은|이|도)$/.test(m[2]) : /^(를|는|가|도)$/.test(m[2]);
  return ok ? m[1] : s;
}

async function answerBorrow(q: string, lang: Lang): Promise<Answer> {
  const tr = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
  // 대소문자는 살린다 — 정보나루 검색이 "the vegetarian" 은 못 찾고 "The Vegetarian" 은 찾는다
  let rest = q.replace(/\s+/g, ' ').trim();

  // 어디서: 도서관 한 곳("서울도서관에서") > 지역("부산에서") — 둘 다 없으면 되묻는다
  const lib = findLibrary(rest);
  const libScoped = lib && /에서|에 있|\bat\b|\bin\b|で|在/i.test(rest) ? lib : undefined;
  if (libScoped) {
    const name = libScoped.name;
    rest = rest
      .replace(name, ' ')
      .replace(name.replace(/\s/g, ''), ' ')
      // 이름을 뗀 자리에 남은 조사 ("서울도서관에서 혼모노" → "혼모노")
      .replace(/^\s*(에서|에 있는|에)\s*/, ' ')
      .replace(/\s(에서|에 있는|에)\s/, ' ');
  }
  // 지역은 "부산에서", "부산 지역" 처럼 조사가 붙을 때만 — 「고양이 해결사 깜냥」의 '고양'을 경기로 잡지 않게
  let sido: string | undefined;
  if (!libScoped) {
    for (const s of SIDO_LIST) {
      const re = new RegExp(`${s}\\s*(에서|에 있는|에|지역|쪽|근처)\\s*`);
      if (re.test(rest)) {
        sido = s;
        rest = rest.replace(re, ' ');
        break;
      }
    }
    const en = /\bin (seoul|busan|incheon|daegu|daejeon|gwangju|ulsan|sejong|jeju|gyeonggi|gangwon|chungcheong|jeolla|gyeongsang)\b/i.exec(rest);
    if (!sido && en) {
      sido = SIDO_WORDS.find(([, re]) => re.test(en[1].toLowerCase()))?.[0];
      rest = rest.replace(en[0], ' ');
    }
    // 일본어 "釜山で", "釜山の図書館で" / 중국어 "在釜山", "釜山的图书馆" — 마찬가지로 붙는 말이 있을 때만
    const cjk = !sido && (CJK_REGION_JA.exec(rest) ?? CJK_REGION_ZH.exec(rest));
    if (cjk) {
      const word = cjk[1] ?? cjk[2];
      sido = SIDO_WORDS.find(([, re]) => re.test(word))?.[0];
      rest = rest.replace(cjk[0], ' ');
    }
  }

  const title = stripTrailingJosa(
    rest.replace(BORROW_NOISE, ' ').replace(/\s+/g, ' ').trim()
      // 일본어 조사 ("소년이 온다を借りたい" → "소년이 온다")
      .replace(/\s*(を|は|が|って)$/, '')
  );
  if (title.replace(/\s/g, '').length < 2) return { text: tr('bot.borrowNeedTitle') };

  if (libScoped && !libScoped.sourceApiId) {
    return { text: tr('bot.borrowLibUnsupported', { nameTopic: josa(libScoped.name, '은는') }), libraries: [libScoped] };
  }

  /*
   * 어디서 찾을지 말하지 않았으면 되묻는다.
   * 전국 80곳을 다 물으면 한 번에 정보나루 160건 — 하루 한도(500건)의 3분의 1이다.
   */
  if (!libScoped && !sido) {
    const home = ['서울', '경기', '부산', '인천'];
    return {
      text: tr('bot.borrowAskRegion', { title }),
      suggestions: home.map((r) => tr('bot.sugBorrowIn', { region: regionName(lang, r), title })),
      keepSuggestions: true,
    };
  }

  // 앱에 담아 둔 많이 빌린 책에 제목이 그대로(또는 그 말로 시작하는) 있으면 서버에 묻지 않는다
  const local = searchLocalBooks(title, 5);
  const squashed = title.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const localHit = local.find((b) => b.title.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '').startsWith(squashed));
  const found = localHit ? [localHit] : await searchBooks(title);
  if (found === 'quota') return { text: tr('loan.quota') };
  if (found === null) return { text: tr('bot.borrowFailed') };
  if (found.length === 0) return { text: tr('bot.borrowNoBook', { title }) };
  const book = found[0];
  const bookLabel = book.author ? `『${book.title}』 (${book.author})` : `『${book.title}』`;

  const libs = libScoped
    ? [libScoped]
    : MOCK_LIBRARIES.filter((l) => l.sourceApiId && l.region.sido === sido);
  if (libs.length === 0) return { text: tr('where.unsupported') };

  const res = await fetchWhereToBorrow(book.isbns.slice(0, 3), libs.map((l) => l.sourceApiId!));
  if (!res) return { text: tr('bot.borrowFailed') };

  const statusOf = (l: Library) => res[l.sourceApiId!];
  const available = libs.filter((l) => statusOf(l)?.hasBook && statusOf(l)?.loanAvailable);
  const onLoan = libs.filter((l) => statusOf(l)?.hasBook && !statusOf(l)?.loanAvailable);
  // 답을 못 받은 곳 — "없다"고 단정하지 않는다
  const unknown = libs.filter((l) => !statusOf(l));
  if (unknown.length === libs.length) return { text: tr('bot.borrowFailed') };
  const where = sido ? regionName(lang, sido) : '';
  const shortTitle = book.title;

  // 다음에 물어볼 만한 것: 다른 지역에서 같은 책
  const suggestions = ['서울', '부산', '경기']
    .filter((r) => r !== sido)
    .slice(0, 2)
    .map((r) => tr('bot.sugBorrowIn', { region: regionName(lang, r), title: shortTitle }));

  if (libScoped) {
    const s = statusOf(libScoped);
    const key: MessageKey = !s ? 'bot.borrowFailed' : !s.hasBook ? 'bot.borrowLibNo' : s.loanAvailable ? 'bot.borrowLibYes' : 'bot.borrowLibOnLoan';
    return { text: tr(key, { book: bookLabel, name: libScoped.name }), libraries: [libScoped], suggestions };
  }
  if (available.length) {
    const names = available.slice(0, 5).map((l) => l.name).join(', ');
    const more = available.length > 5 ? tr('bot.borrowMore', { n: available.length - 5 }) : '';
    return {
      text: tr('bot.borrowYes', { book: bookLabel, where, total: libs.length, n: available.length, names: names + more }),
      libraries: available.slice(0, 5),
      suggestions,
    };
  }
  if (onLoan.length) {
    return { text: tr('bot.borrowAllOnLoan', { book: bookLabel, where, n: onLoan.length }), libraries: onLoan.slice(0, 5), suggestions };
  }
  if (unknown.length) {
    return {
      text: tr('bot.borrowNonePartial', { book: bookLabel, where, n: libs.length - unknown.length, m: unknown.length }),
      suggestions,
    };
  }
  return { text: tr('bot.borrowNone', { book: bookLabel, where, total: libs.length }), suggestions };
}

/**
 * "「채식주의자」랑 비슷한 책" — 그 책을 빌린 사람들이 함께 빌린 책.
 * 책은 앱에 담아 둔 목록에서 먼저 찾고(한도 안 씀), 없으면 정보나루 검색.
 */
async function answerSimilar(q: string, lang: Lang, more: () => string[]): Promise<Answer> {
  const tr = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
  const title = stripTrailingJosa(
    q
      .replace(SIMILAR_NOISE, ' ')
      // 홀로 선 '책' 만 뗀다 (「책 먹는 여우」의 책은 남긴다)
      .replace(/(^|\s)책(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
  if (title.replace(/\s/g, '').length < 2) return { text: tr('bot.similarNeedTitle'), suggestions: more() };

  const squashed = title.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const localHit = searchLocalBooks(title, 5).find((b) => b.title.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '').startsWith(squashed));
  const found = localHit ? [localHit] : await searchBooks(title);
  if (found === 'quota') return { text: tr('loan.quota') };
  if (found === null) return { text: tr('bot.similarFailed') };
  if (found.length === 0) return { text: tr('bot.borrowNoBook', { title }), suggestions: more() };
  const book = found[0];

  const related = await fetchRelated(book.isbns[0]);
  if (related === 'quota') return { text: tr('loan.quota') };
  if (related === null) return { text: tr('bot.similarFailed') };
  if (related.length === 0) return { text: tr('bot.similarNone', { title: book.title }), suggestions: more() };
  return {
    text: tr('bot.similarFound', { title: book.title }),
    books: related.slice(0, 6).map((b) => ({
      id: `similar-${b.isbns[0]}`,
      title: b.title,
      author: b.author,
      coverImageUrl: b.coverImageUrl,
      isbn: b.isbns[0],
      isbns: b.isbns,
      category: 'humanities' as CategoryId,
    })),
    suggestions: [tr('bot.sugBorrowIn', { region: regionName(lang, '서울'), title: `「${book.title}」` }), ...more()].slice(0, CHIP_COUNT),
  };
}

/**
 * 달곰이에게 달곰이 이야기를 묻는지.
 *
 * 답은 가이드북 「달곰이를 소개합니다!」 쪽(이름·MBTI·취미·특기·좋아하는 것·싫어하는 것,
 * 어떤 친구인지, 책 속에서 하는 일, 가방 속 준비물)을 그대로 옮겼다 (i18n 의 me.*).
 * "달곰이/너" 같은 말이 있어야 한다 — "좋아하는 도서관 추천" 같은 도서관 질문을 가로채지 않게.
 */
const ME_TOPICS = ['who', 'job', 'mbti', 'hobby', 'talent', 'likes', 'dislikes', 'bag', 'profile'] as const;
type MeTopic = (typeof ME_TOPICS)[number];
const ME_WORD = /달곰|너는|너의|너가|네가|니가|넌|^너\b|\byou\b|\byour\b|\bdalgomi\b|ダルゴミ|あなた|君は|达尔戈米|你是|你的|你喜欢|你讨厌/;
const ME_ASK: [MeTopic, RegExp][] = [
  ['bag', /가방|배낭|\bbag\b|\bbackpack\b|かばん|リュック|背包|包里/],
  ['mbti', /mbti|엠비티아이|성격/],
  ['hobby', /취미|\bhobb(y|ies)\b|趣味|爱好/],
  ['talent', /특기|잘하는|잘해|\btalents?\b|\bgood at\b|特技|得意|特长|擅长/],
  ['dislikes', /싫어|싫은|\bdislikes?\b|\bhate\b|嫌い|苦手|讨厌|不喜欢/],
  ['likes', /좋아하|좋아해|\blikes?\b|\bfavorite\b|好き|喜欢/],
  ['job', /하는 일|무슨 일|뭐 해|뭐해|무엇을 해|역할|\bwhat do(es)? (you|dalgomi) do\b|\brole\b|仕事|何をする|何をしている|做什么|干什么/],
  ['who', /누구|어떤 친구|소개|\bwho are you\b|\bwho is dalgomi\b|\bintroduce\b|誰|自己紹介|どんな友だち|どんな子|是谁|介绍|什么样的朋友/],
  ['profile', /프로필|정보|\bprofile\b|プロフィール|资料/],
];
function askAboutMe(text: string): MeTopic | undefined {
  if (!ME_WORD.test(text)) return undefined;
  // "달곰이가 좋아하는 도서관 알려줘" 는 도서관 추천 질문이다
  if (/도서관|librar|図書館|图书馆/.test(text) && !/누구|소개|하는 일|무슨 일|who|introduce/.test(text)) return undefined;
  return ME_ASK.find(([, re]) => re.test(text))?.[0];
}

/**
 * 질문 하나에 답한다.
 *
 * 순서가 중요하다. 도서관 이름이 들어 있으면 그 도서관 이야기로 본다.
 * "부산도서관 주변 카페" 에서 '부산'을 지역으로 먼저 잡아 버리면
 * 부산 전체 목록을 내놓게 된다.
 */
export interface AskOptions {
  /**
   * 이어 물을 칩을 섞는 씨앗. 대화 화면이 질문마다 새로 뽑아 적어 둔다.
   * 안 주면 질문 글자로 만든다(검사 스크립트처럼 늘 같은 결과가 필요할 때).
   */
  seed?: number;
  /** 이 대화에서 이미 물어본 질문들. 칩으로 다시 권하지 않는다 */
  avoid?: string[];
  /** 최근 본 도서관 — 자리를 말하지 않은 날씨·미세먼지·"오늘 어디 갈까"의 기준 자리 */
  recentLibraryId?: string;
  /** "여기 다녀왔어요"를 누른 기록 (새것부터, 같은 곳이 여러 번 있을 수 있다) */
  visitedIds?: string[];
}

/** 이어지는 칩은 이만큼까지만 — 나머지는 아무 주제에서나 */
const RELATED_MAX = 2;
/** 칩 글자 속 도서관 찾기용 — 긴 이름부터 (「광주시립점자도서관」 안의 다른 이름에 먼저 걸리지 않게) */
const LIBRARIES_LONGEST_FIRST = [...MOCK_LIBRARIES].sort((a, b) => b.name.length - a.name.length);

/** 씨앗으로 섞기 (같은 씨앗이면 같은 순서 — 말을 바꿔 다시 답해도 같은 칩이 그 말로 바뀐다) */
function seededShuffle<T>(items: T[], seed: number): T[] {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 모든 답의 칩을 마지막에 한 번 섞는다.
 *
 * 답마다 이어 물을 칩을 주는데, 몇몇 답은 같은 갈래만 다섯 개를 줬다 — 「달곰이 MBTI는?」 뒤에
 * 달곰이 질문만 다섯 개가 이어져 한 주제에 갇혔다. 그래서 답이 준 칩에서는 많아야 둘만 (씨앗으로
 * 골라) 남기고, 나머지는 검사를 통과한 칩 전체에서 아무렇게나 채운다. 네 말 모두 같은 규칙이다.
 * "어느 지역에서 찾을까요?" 처럼 칩이 곧 대답인 되물음(keepSuggestions)은 그대로 둔다.
 */
function mixSuggestions(answer: Answer, lang: Lang, seed: number, avoid: string[]): Answer {
  if (answer.keepSuggestions) return answer;
  const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const asked = new Set(avoid.map(squash));
  const meChips = new Set(ME_TOPICS.map((k) => squash(translate(lang, `me.sug.${k}` as MessageKey))));
  const related = seededShuffle(answer.suggestions ?? [], seed)
    .filter((s) => !asked.has(squash(s)))
    .slice(0, RELATED_MAX);
  const relatedHasMe = related.some((s) => meChips.has(squash(s)));
  const out = [...related];
  const seen = new Set(out.map(squash));
  // 한 도서관 이야기는 다섯 칸 중 둘까지 (아무렇게나 채운 칩이 우연히 같은 도서관을 또 뽑는 일이 있었다)
  const perLibrary = new Map<string, number>();
  const libraryIn = (s: string) => LIBRARIES_LONGEST_FIRST.find((l) => s.includes(l.name))?.id;
  for (const s of out) {
    const id = libraryIn(s);
    if (id) perLibrary.set(id, (perLibrary.get(id) ?? 0) + 1);
  }
  // 한 번 훑어 모자라면(이미 물어본 것이 많을 때) 씨앗을 바꿔 한 번 더
  for (const pool of [starterQuestions(lang, seed + 7, avoid), starterQuestions(lang, seed + 13, avoid)]) {
    for (const s of pool) {
      if (out.length >= CHIP_COUNT) break;
      const k = squash(s);
      // 달곰이 이야기를 이미 이어 권했으면 하나 더 얹지 않는다
      if (seen.has(k) || asked.has(k) || (relatedHasMe && meChips.has(k))) continue;
      const id = libraryIn(s);
      if (id && (perLibrary.get(id) ?? 0) >= RELATED_MAX) continue;
      if (id) perLibrary.set(id, (perLibrary.get(id) ?? 0) + 1);
      out.push(s);
      seen.add(k);
    }
  }
  return { ...answer, suggestions: out };
}

export async function ask(question: string, lang: Lang = 'ko', options: AskOptions = {}): Promise<Answer> {
  const q = question.trim();
  const seed = options.seed ?? seedFrom(norm(q));
  const answer = await answerQuestion(question, lang, options);
  return mixSuggestions(answer, lang, seed, [...(options.avoid ?? []), q]);
}

async function answerQuestion(
  question: string,
  lang: Lang = 'ko',
  options: AskOptions = {}
): Promise<Answer> {
  const tr = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
  const q = question.trim();
  if (!q) return { text: tr('bot.help', { count: LIBRARY_COUNT }) };
  const text = norm(q);
  // 방금 이 질문도 다시 권하지 않는다 ("지금 문 연 도서관" 을 누르고 또 "지금 문 연 도서관")
  const ctx: PickContext = {
    lang,
    seed: options.seed ?? seedFrom(text),
    avoid: [...(options.avoid ?? []), q],
  };

  if (ASK.greeting.test(text)) {
    return {
      text: tr('bot.hello', { count: LIBRARY_COUNT }),
      suggestions: starterQuestions(lang, ctx.seed, ctx.avoid),
    };
  }
  if (ASK.thanks.test(text)) {
    return { text: tr('bot.thanks') };
  }
  if (ASK.help.test(text)) {
    return { text: tr('bot.help', { count: LIBRARY_COUNT }) };
  }
  // 나들이 코스 — 도서관을 말했으면 거기서 출발, 아니면 코스 탭으로
  if (ASK_COURSE.test(text)) {
    const at = findLibrary(q);
    return at
      ? { text: tr('bot.courseLib', { name: at.name }), course: { libraryId: at.id }, libraries: [at] }
      : { text: tr('bot.course'), course: {}, suggestions: starterQuestions(lang, ctx.seed, ctx.avoid) };
  }

  // "지금 몇 시야?" — 지금 시각 + 오늘이 공휴일이면 그 이름 + 지금 문 연 도서관 수
  if (ASK_TIME.test(text) && !/도서관|librar|図書館|图书馆/.test(text)) {
    const now = new Date();
    const holiday = holidayName(now);
    const openCount = MOCK_LIBRARIES.filter((l) => isOpenNow(l.hours, now) === true).length;
    return {
      text:
        tr('bot.timeNow', { when: formatNow(now, lang) }) +
        (holiday ? tr('bot.timeHoliday', { name: holidayText(holiday, lang) }) : '') +
        (openCount > 0 ? tr('bot.timeOpen', { n: openCount }) : tr('bot.timeOpenNone')),
      suggestions: [tr('bot.sugOpen'), ...starterQuestions(lang, ctx.seed, ctx.avoid)].slice(0, CHIP_COUNT),
    };
  }

  /*
   * 날씨·미세먼지를 볼 자리: 도서관을 말하면 그 자리, 지역을 말하면 그 지역 대표 도서관 자리,
   * 둘 다 없으면 최근 본 도서관, 그것도 없으면 서울.
   */
  const recent = options.recentLibraryId ? MOCK_LIBRARIES.find((l) => l.id === options.recentLibraryId) : undefined;
  const spotFor = () => {
    const lib = findLibrary(q);
    const sido = lib ? undefined : findSido(q);
    if (lib?.coords) return { coords: lib.coords, place: lib.name, sido: lib.region.sido };
    if (!sido && recent?.coords) return { coords: recent.coords, place: recent.name, sido: recent.region.sido };
    const region = sido ?? '서울';
    const rep =
      MOCK_LIBRARIES.find((l) => l.region.sido === region && l.isLandmark && l.coords) ??
      MOCK_LIBRARIES.find((l) => l.region.sido === region && l.coords);
    return rep?.coords ? { coords: rep.coords, place: regionName(lang, region), sido: region } : undefined;
  };
  const moreStarters = () => starterQuestions(lang, ctx.seed, ctx.avoid);

  /*
   * "오늘 어느 도서관 갈까?" — 날씨·미세먼지를 보고 고른다 (홈의 날씨 카드와 같은 기준).
   * 맑고 공기가 괜찮으면 자연·환경, 아니면 오래 머물기 좋은 랜드마크 도서관. 지금 문 연 곳을 먼저.
   */
  if (ASK_TODAY.test(text)) {
    const spot = spotFor();
    const [w, a] = spot
      ? await Promise.all([weatherEnabled ? fetchWeather(spot.coords) : null, airEnabled ? fetchAir(spot.coords) : null])
      : [null, null];
    const sido = spot?.sido ?? '서울';
    const where = regionName(lang, sido);
    const kind: CategoryId | undefined = w ? (weatherMood(w) === 'nice' && !(a && airIsBad(a)) ? 'nature' : 'landmark') : undefined;
    const openFirst = (libs: Library[]) =>
      [...libs].sort((x, y) => Number(isOpenNow(y.hours) === true) - Number(isOpenNow(x.hours) === true));
    const inRegion = MOCK_LIBRARIES.filter((l) => l.region.sido === sido);
    let picks = kind ? openFirst(inRegion.filter((l) => l.categories.includes(kind))) : [];
    let pickKey: MessageKey = kind === 'nature' ? 'bot.todayNature' : 'bot.todayIndoor';
    if (picks.length === 0) {
      picks = openFirst(inRegion);
      pickKey = 'bot.todayAny';
    }
    const g = (v?: number) => (v ? tr(`air.grade.${v}` as MessageKey) : '–');
    const lines = [
      w && spot
        ? tr('weather.now', { place: spot.place, temp: w.temp !== undefined ? String(Math.round(w.temp)) : '–', sky: tr(`weather.${w.condition}` as MessageKey) })
        : undefined,
      a ? tr('bot.todayAirLine', { pm10: g(a.pm10Grade), pm25: g(a.pm25Grade) }) : undefined,
      tr(pickKey, { where }),
    ].filter(Boolean);
    return { text: lines.join('\n'), libraries: picks.slice(0, 3), suggestions: moreStarters() };
  }

  // "미세먼지 어때?" — 가장 가까운 에어코리아 측정소 값 (날씨보다 먼저: "공기"·"먼지"는 날씨 말이 아니다)
  if (airEnabled && ASK_AIR.test(text)) {
    const spot = spotFor();
    const a = spot ? await fetchAir(spot.coords) : null;
    if (!spot || !a) return { text: tr('bot.airUnknown') };
    const g = (v?: number) => (v ? tr(`air.grade.${v}` as MessageKey) : '–');
    return {
      text:
        tr('bot.air', {
          place: spot.place,
          pm10: g(a.pm10Grade),
          pm10v: a.pm10 !== undefined ? String(a.pm10) : '–',
          pm25: g(a.pm25Grade),
          pm25v: a.pm25 !== undefined ? String(a.pm25) : '–',
          station: stationName(a, lang),
          time: a.dataTime?.slice(11, 16) ?? '',
        }) +
        '\n' +
        (airIsBad(a) ? tr('air.tip.bad') : tr('bot.airGood')),
      suggestions: (airIsBad(a) ? [tr('bot.sugOpen'), tr('weather.sugIndoor')] : [tr('weather.sugNature'), tr('bot.sugOpen')]).slice(0, CHIP_COUNT),
    };
  }

  if (weatherEnabled && ASK_WEATHER.test(text)) {
    const spot = spotFor();
    const w = spot ? await fetchWeather(spot.coords) : null;
    if (!spot || !w) return { text: tr('bot.weatherUnknown') };
    const mood = weatherMood(w);
    return {
      text:
        tr('weather.now', {
          place: spot.place,
          temp: w.temp !== undefined ? String(Math.round(w.temp)) : '–',
          sky: tr(`weather.${w.condition}` as MessageKey),
        }) +
        '\n' +
        tr(`weather.tip.${mood}` as MessageKey),
      suggestions: [...(mood === 'nice' ? [tr('weather.sugNature'), tr('bot.sugOpen')] : [tr('bot.sugOpen'), tr('weather.sugIndoor')]), ...(airEnabled ? [tr('bot.sugAir')] : [])].slice(0, CHIP_COUNT),
    };
  }

  // 휠체어·유모차·점자 — 한국관광공사 무장애 정보가 있는 도서관만 (지어내지 않는다)
  /*
   * 도서관 이름에 든 말은 빼고 본다. 「광주시립점자도서관 운영시간」 의 '점자' 때문에
   * 운영시간 대신 무장애 정보로 답하던 것.
   */
  const named = findLibrary(q);
  const accessText = named ? text.split(norm(named.name)).join(' ') : text;
  if (ASK_ACCESS.test(accessText)) {
    const want: 'family' | 'visual' | 'hearing' | 'physical' = /유모차|수유|기저귀|아이|아기|stroller|baby|nursing|ベビー|授乳|婴儿|母婴|哺乳/.test(text)
      ? 'family'
      : /점자|시각|braille|blind|visual|点字|視覚|盲/.test(text)
        ? 'visual'
        : /수어|청각|sign language|hearing|deaf|手話|聴覚|手语|听障/.test(text)
          ? 'hearing'
          : 'physical';
    const lib = findLibrary(q);
    if (lib) {
      const info = barrierFreeFor(lib.id);
      if (!info) return { text: tr('bot.bfUnknownLib', { nameTopic: josa(lib.name, '은는') }), libraries: [lib] };
      const lines = BF_GROUPS[want].filter((f) => info[f]).map((f) => `· ${tr(`bf.f.${f}` as MessageKey)}: ${info[f]}`);
      return {
        text: lines.length
          ? `${tr('bot.bfLib', { name: lib.name, group: tr(`bf.group.${want}` as MessageKey) })}\n${lines.join('\n')}`
          : tr('bot.bfLibNoGroup', { name: lib.name, group: tr(`bf.group.${want}` as MessageKey) }),
        libraries: [lib],
      };
    }
    const sido = findSido(q);
    const matches = MOCK_LIBRARIES.filter((l) => {
      const info = barrierFreeFor(l.id);
      if (!info || (sido && l.region.sido !== sido)) return false;
      return want === 'physical' ? bfHas(info.wheelchair) || bfHas(info.elevator) : BF_GROUPS[want].some((f) => bfHas(info[f]));
    });
    return {
      text: matches.length
        ? tr('bot.bfList', { group: tr(`bf.group.${want}` as MessageKey), n: matches.length })
        : tr('bot.bfNone', { group: tr(`bf.group.${want}` as MessageKey) }),
      libraries: matches.slice(0, 5),
      suggestions: matches.slice(0, 2).map((l) => tr('bot.sugBf', { name: l.name })),
    };
  }

  const namedLib = findLibrary(q);

  // "20대가 많이 빌린 책" — 전국 연령별 대출 순위 (미리 모아 둔 것). 도서관 이름이 있으면 그 도서관 이야기로 간다
  const age = !namedLib && ASK_TREND_BOOK.test(text) ? AGE_KEYS.find((k) => AGE_WORDS[k].test(text)) : undefined;
  if (age) {
    const gender: GenderKey = FEMALE.test(text) ? 'female' : MALE.test(text) ? 'male' : 'all';
    const books = booksForAge(age, gender);
    const ageLabel = tr(`trend.age.${age}` as MessageKey);
    // 나이대 + 성별: "20대 여성" · "30代女性" · "30多岁男性" · "30s (women)"
    const genderLabel = tr(`trend.gender.${gender}` as MessageKey);
    const whoLabel =
      gender === 'all'
        ? ageLabel
        : lang === 'en'
          ? `${ageLabel} (${genderLabel.toLowerCase()})`
          : lang === 'ko'
            ? `${ageLabel} ${genderLabel}`
            : `${ageLabel}${genderLabel}`;
    if (books.length === 0) return { text: tr('trend.empty'), suggestions: moreStarters() };
    return {
      text: tr('bot.trendAge', { who: whoLabel, whoSubj: josa(whoLabel, '이가') }),
      books: books.slice(0, 5),
      suggestions: AGE_KEYS.filter((k) => k !== age && booksForAge(k, 'all').length)
        .slice(0, 2)
        .map((k) => tr('bot.sugTrendAge', { age: tr(`trend.age.${k}` as MessageKey) }))
        .concat(moreStarters())
        .slice(0, CHIP_COUNT),
    };
  }

  // "이번 달 인기 키워드" — 정보나루 지난달 키워드 (미리 모아 둔 것. 그 달 것은 달이 끝나야 나온다)
  if (ASK_KEYWORDS.test(text) && keywordItems.length) {
    const monthNum = Number(keywordMonth.slice(5, 7));
    const month = lang === 'en' ? MONTHS_EN[monthNum - 1] ?? String(monthNum) : String(monthNum);
    const words = keywordItems.slice(0, 8).map((k) => `#${libText(k.word, lang)}`).join(' ');
    const first = keywordItems[0];
    return {
      text: tr('bot.keywords', { month, words, first: lang === 'ko' ? first.word : `${first.word} (${libText(first.word, lang)})` }),
      books: first.books.slice(0, 5),
      suggestions: moreStarters(),
    };
  }

  // "「채식주의자」랑 비슷한 책" — 그 책을 빌린 사람들이 함께 빌린 책 (정보나루, 서버가 7일 기억)
  if (loanLookupEnabled && ASK_SIMILAR.test(text)) {
    return answerSimilar(q, lang, moreStarters);
  }

  // "내가 몇 곳 다녀왔어?" — 이 기기에 적힌 방문 기록
  if (ASK_MY_VISITS.test(text)) {
    const ids = [...new Set(options.visitedIds ?? [])];
    if (ids.length === 0) return { text: tr('bot.myVisitsNone'), suggestions: moreStarters() };
    const libs = ids.map((id) => MOCK_LIBRARIES.find((l) => l.id === id)).filter((l): l is Library => !!l);
    return {
      text: tr('bot.myVisits', { n: ids.length, title: tr(buddyTitle(ids.length) as MessageKey) }),
      libraries: libs.slice(0, 3),
      suggestions: moreStarters(),
    };
  }

  // "오늘 쉬는 도서관" — 휴관일·공휴일·격주 휴관을 따져서. 요일별 시간을 모르는 곳은 세지 않는다
  if (!namedLib && ASK_CLOSED_TODAY.test(text)) {
    const sido = findSido(q);
    const pool = MOCK_LIBRARIES.filter((l) => !sido || l.region.sido === sido);
    const known = pool.filter((l) => isClosedToday(l.hours) !== null);
    const closed = known.filter((l) => isClosedToday(l.hours) === true);
    const where = sido ? tr('bot.whereIn', { sido: regionName(lang, sido) }) : '';
    if (closed.length === 0) {
      return { text: tr('bot.closedTodayNone', { where, known: known.length }), suggestions: [tr('bot.sugOpen'), ...moreStarters()].slice(0, CHIP_COUNT) };
    }
    return {
      text: tr('bot.closedTodayList', { where, n: closed.length, known: known.length }) + (closed.length > MAX_CARDS ? tr('bot.browseTail', { n: MAX_CARDS }) : ''),
      libraries: pick(closed),
      suggestions: [tr('bot.sugOpen'), ...moreStarters()].slice(0, CHIP_COUNT),
    };
  }

  // "소년이 온다 어디서 빌려?" — 책을 찾아 도서관에 지금 빌릴 수 있는지 묻는다
  if (loanLookupEnabled && ASK_BORROW.test(text)) {
    return answerBorrow(q, lang);
  }

  // 달곰이 자기 이야기 — 가이드북 「달곰이를 소개합니다!」 쪽 내용 그대로
  const aboutMe = askAboutMe(text);
  if (aboutMe) {
    return {
      text: tr(`me.${aboutMe}` as MessageKey),
      suggestions: ME_TOPICS.filter((k) => k !== aboutMe && k !== 'profile')
        .slice(0, CHIP_COUNT)
        .map((k) => tr(`me.sug.${k}` as MessageKey)),
    };
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
    const answer = answerBrowse(q, lang, ctx, findCategory(q), findSido(q));
    const exact = MOCK_LIBRARIES.find((l) => norm(l.name) === `${sidoWord}도서관`);
    const hoursChip = exact ? tr('bot.sugHours', { name: exact.name }) : undefined;
    // 이미 물어본 적이 있으면 붙이지 않는다 (다른 칩들과 같은 규칙)
    const alreadyAsked = (ctx.avoid ?? []).some(
      (a) => norm(a).replace(/\s/g, '') === norm(hoursChip ?? '').replace(/\s/g, '')
    );
    if (hoursChip && !alreadyAsked) {
      answer.suggestions = [
        hoursChip,
        ...(answer.suggestions ?? []).filter((s) => s !== hoursChip),
      ].slice(0, CHIP_COUNT);
    }
    return answer;
  }

  const lib = findLibrary(q);
  if (lib) return answerAboutLibrary(lib, q, lang, ctx);

  // 도서관을 지목하지 않고 "근처 카페" 만 물으면 어디 기준인지 알 수 없다
  if (NEARBY_WORDS.some(([, re]) => re.test(text)) && !findCategory(q)) {
    return {
      text: tr('bot.needLibrary'),
      suggestions: nearbyExamples(ctx, () => [
        tr('bot.sugSeoulCafe'),
        tr('bot.sugBusanFood'),
      ]),
    };
  }

  const category = findCategory(q);
  const sido = findSido(q);

  if (category || sido || ASK.openNow.test(text) || ASK.wantsList.test(text)) {
    return answerBrowse(q, lang, ctx, category, sido);
  }

  return {
    text: `${tr('bot.notUnderstood', { q })}\n\n${tr('bot.help', { count: LIBRARY_COUNT })}`,
    suggestions: starterQuestions(lang, ctx.seed, ctx.avoid),
  };
}

/**
 * 처음 화면에 띄울 예시 질문.
 *
 * 눌리면 그대로 질문으로 들어가므로, 달곰이가 알아듣는 말이어야 한다.
 * 도서관 이름은 어느 말에서든 한글 그대로다 — 이름을 옮기면 찾지 못한다.
 *
 * 검사를 통과한 1천여 개(npm run chat-ideas) 중에서 씨앗으로 네 개를 고른다.
 * 대화 화면을 열 때마다 씨앗이 바뀌어 다른 칩이 나온다.
 * 목록을 못 쓰면 아래 고정 네 개로 돌아간다 (복구 장치).
 */
export function starterQuestions(lang: Lang, seed = 1, avoid: string[] = []): string[] {
  const tr = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
  const fixed = () => [
    tr('bot.sugKids'),
    tr('bot.sugOpen'),
    tr('bot.sugHours', { name: '서울도서관' }),
    tr('bot.sugCafe', { name: '한밭도서관' }),
  ];
  const ideas = starterIdeas({ lang, seed, avoid }, fixed);
  // 달곰이 자기소개도 하나 섞는다 — 물어볼 수 있다는 걸 처음 보는 사람도 알게
  const meChip = tr(`me.sug.${ME_TOPICS[seed % (ME_TOPICS.length - 1)]}` as MessageKey);
  if (avoid.includes(meChip) || ideas.includes(meChip)) return ideas;
  return [...ideas.slice(0, Math.max(0, ideas.length - 1)), meChip];
}

/** 개발 중 상태 확인용 */
export const assistantScope = {
  libraryCount: MOCK_LIBRARIES.length,
  namesForMatching: listNames,
};
