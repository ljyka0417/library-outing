import { translate, type Lang } from '@/i18n';

/**
 * 한글 이름을 로마자로 옮긴다 (국어의 로마자 표기법).
 *
 * ⚠️ 이건 **번역이 아니라 읽는 법**이다.
 *   132곳의 공식 영문 이름은 우리에게 없다. 없는 이름을 지어내는 대신,
 *   정해진 규칙대로 소리를 옮겨 적는다. 「논현마루도서관」은
 *   "Nonhyeonmaru Library" 가 되는데, 이건 그 도서관의 공식 영문명이라는
 *   뜻이 아니라 그렇게 소리 내면 된다는 뜻이다.
 *
 *   그래서 화면에서 한글 이름을 **지우지 않고 밑에 한 줄 더 붙인다.**
 *   외국인은 읽고, 길을 물을 때는 한글을 그대로 보여 주면 된다.
 *   「국립중앙도서관」처럼 공식 영문명(National Library of Korea)이 따로
 *   있는 곳도 있어서, 로마자로 이름을 갈아 치우면 오히려 틀린 이름이 된다.
 *
 * 넣은 규칙   음절 분해, 연음, 자주 나오는 자음 동화
 *             (국립 → Gungnip, 종로 → Jongno, 신라 → Silla, 좋고 → joko)
 * 뺀 규칙     사이시옷·된소리되기처럼 표기에 잘 드러나지 않는 것들.
 *             이름을 읽는 데 영향이 적고, 규칙이 늘수록 틀릴 자리도 는다.
 */

const BASE = 0xac00;
const LAST = 0xd7a3;

/** 첫소리 19개 */
const ONSET = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's',
  'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
];

/** 가운뎃소리 21개 */
const VOWEL = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
  'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
];

/** 받침 28개. 뒤에 소리가 이어지지 않을 때의 값이다. */
const CODA = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k',
  'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't',
  't', 'ng', 't', 't', 'k', 't', 'p', 't',
];

/**
 * 뒤 음절이 ㅇ 으로 시작할 때 받침이 어떻게 갈라지는가 (연음).
 * [앞에 남는 소리, 뒤로 넘어가는 소리]
 *
 * 겹받침은 앞뒤로 나뉜다 — 닭이 dalgi, 앉아 anja.
 * ㅇ 받침은 넘어가지 않고(강아지 gangaji), ㅎ 은 사라진다(좋아 joa).
 */
const LIAISON: [string, string][] = [
  ['', ''], ['', 'g'], ['', 'kk'], ['k', 's'], ['', 'n'], ['n', 'j'],
  ['', 'n'], ['', 'd'], ['', 'r'], ['l', 'g'], ['l', 'm'], ['l', 'b'],
  ['l', 's'], ['l', 't'], ['l', 'p'], ['', 'r'], ['', 'm'], ['', 'b'],
  ['p', 's'], ['', 's'], ['', 'ss'], ['ng', ''], ['', 'j'], ['', 'ch'],
  ['', 'k'], ['', 't'], ['', 'p'], ['', ''],
];

interface Piece {
  /** 한글이 아닌 글자는 그대로 흘려보낸다 */
  raw?: string;
  onset: string;
  vowel: string;
  coda: string;
  onsetIdx: number;
  codaIdx: number;
}

function decompose(ch: string): Piece {
  const code = ch.charCodeAt(0);
  if (code < BASE || code > LAST) {
    return { raw: ch, onset: '', vowel: '', coda: '', onsetIdx: -1, codaIdx: 0 };
  }
  const n = code - BASE;
  const onsetIdx = Math.floor(n / 588);
  const vowelIdx = Math.floor((n % 588) / 28);
  const codaIdx = n % 28;
  return {
    onset: ONSET[onsetIdx],
    vowel: VOWEL[vowelIdx],
    coda: CODA[codaIdx],
    onsetIdx,
    codaIdx,
  };
}

/** 받침과 다음 첫소리가 만나 소리가 바뀌는 자리들 */
function assimilate(coda: string, onset: string): [string, string] {
  const stop = coda === 'k' || coda === 't' || coda === 'p';
  const nasal = (c: string) => (c === 'k' ? 'ng' : c === 't' ? 'n' : 'm');

  // ㄱ/ㄷ/ㅂ + ㄴ·ㅁ → 콧소리 (국립 → Gungnip)
  if (stop && (onset === 'n' || onset === 'm')) return [nasal(coda), onset];
  // ㄱ/ㄷ/ㅂ + ㄹ → 콧소리 + ㄴ (국력 → Gungnyeok)
  if (stop && onset === 'r') return [nasal(coda), 'n'];
  // ㅁ/ㅇ + ㄹ → ㄹ 이 ㄴ 으로 (종로 → Jongno)
  if (onset === 'r' && (coda === 'm' || coda === 'ng')) return [coda, 'n'];
  // ㄴ+ㄹ, ㄹ+ㄴ → ㄹㄹ (신라 → Silla, 설날 → Seollal)
  if (coda === 'n' && onset === 'r') return ['l', 'l'];
  if (coda === 'l' && onset === 'n') return ['l', 'l'];
  return [coda, onset];
}

/** 한글을 로마자로. 한글이 아닌 글자는 그대로 둔다. */
export function romanize(text: string): string {
  const parts = [...text].map(decompose);

  for (let i = 0; i < parts.length - 1; i++) {
    const a = parts[i];
    const b = parts[i + 1];
    if (a.raw || b.raw || a.codaIdx === 0) continue;

    if (b.onsetIdx === 11) {
      // 다음이 ㅇ 으로 시작 → 받침이 그 자리로 넘어간다
      const [stay, move] = LIAISON[a.codaIdx];
      a.coda = stay;
      b.onset = move;
    } else if (a.codaIdx === 27) {
      // ㅎ 받침 + 예사소리 → 거센소리 (좋고 → joko)
      const harder: Record<string, string> = { g: 'k', d: 't', b: 'p', j: 'ch' };
      a.coda = '';
      b.onset = harder[b.onset] ?? b.onset;
    } else if (b.onsetIdx === 18) {
      /*
       * 받침 + ㅎ 은 합치지 않는다.
       *
       * 말할 때는 거센소리가 되지만(축하 → 추카), 이름에서는 ㅎ 을 밝혀
       * 적는 것이 표기법이다 — 국회 Gukhoe, 묵호 Mukho, 집현전 Jiphyeonjeon.
       * 우리가 옮기는 것은 전부 이름이므로 밝혀 적는 쪽을 따른다.
       */
    } else {
      const [coda, onset] = assimilate(a.coda, b.onset);
      a.coda = coda;
      b.onset = onset;
    }
  }

  return parts.map((p) => p.raw ?? p.onset + p.vowel + p.coda).join('');
}

/**
 * 이름 안에서 따로 떼어 읽는 낱말들.
 *
 * 한글 이름은 붙여 쓰는 일이 많은데, 그대로 옮기면 한 덩어리가 된다.
 * 「국립어린이청소년도서관」이 "Gungnibeorinicheongsonyeon" 이 되면 읽을
 * 수가 없다. 여기 있는 낱말에서 끊어 주면 "Gungnip Eorini Cheongsonyeon"
 * 이 된다. 표기법도 낱말 사이를 띄우라고 한다.
 *
 * ⚠️ 반드시 **한글 상태에서** 끊어야 한다. 로마자로 옮긴 뒤에 끊으면
 *   늦는다 — 받침이 이미 다음 낱말로 넘어가 버린다(립+어 → nibeo).
 *
 * 사전이 아니라 자주 나오는 말만 모은 것이다. 목록에 없는 말은 붙어 있는
 * 채로 나오는데, 틀린 게 아니라 덜 읽기 쉬울 뿐이다.
 */
const WORDS = [
  // 설립 주체·규모
  '국립', '국회', '시립', '도립', '군립', '구립', '공립', '중앙', '작은',
  // 주제
  '어린이', '청소년', '영어', '국제', '전문', '식물원', '식물', '식문화', '미디어',
  '문화', '가족', '마을', '기념', '대학교', '한옥',
  '뉴미디어', '정보과학', '정보', '과학', '문학', '철학', '역사', '음악',
  '만화', '웹툰', '그림책', '다문화', '평생학습', '기적의', '해양', '여행',
  // 지역 (이름 앞에 붙는 경우가 많다)
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
  '고양', '성남', '수원', '안산', '화성', '원주', '춘천', '강릉', '속초',
  '청주', '천안', '아산', '전주', '순천', '목포', '여수', '경주', '포항',
  '진주', '창원', '송도', '청라', '영종', '판교', '의정부', '과천', '주엽',
];

/** 긴 낱말부터 맞춰 본다 ('정보과학' 이 '정보' 보다 먼저 걸리도록) */
const WORDS_BY_LENGTH = [...WORDS].sort((a, b) => b.length - a.length);

/** 아는 낱말에서 이름을 끊는다. 못 알아본 부분은 붙어 있는 채로 둔다. */
function splitWords(name: string): string[] {
  const out: string[] = [];
  let rest = '';
  let i = 0;

  while (i < name.length) {
    const hit = WORDS_BY_LENGTH.find((w) => name.startsWith(w, i));
    if (hit) {
      if (rest) {
        out.push(rest);
        rest = '';
      }
      out.push(hit);
      i += hit.length;
    } else {
      rest += name[i];
      i += 1;
    }
  }
  if (rest) out.push(rest);
  return out.length > 0 ? out : [name];
}

/** 띄어쓴 덩어리마다 첫 글자를 대문자로 */
function titleCase(s: string): string {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * 도서관 이름을 그 말로 읽을 수 있게 적어 준다.
 *
 * 한국어일 때는 빈 문자열을 돌려준다 — 한글 이름이 이미 원문이라
 * 밑에 덧붙일 것이 없다.
 *
 * 꼬리의 '도서관' 만은 그 말로 옮긴다. 이건 이름이 아니라 종류를 가리키는
 * 말이라 옮겨도 없는 것을 지어내는 게 아니고, 옮겨 두면 "이게 도서관
 * 이름이구나" 를 한눈에 알 수 있다.
 */
export function readableName(name: string, lang: Lang): string {
  if (lang === 'ko') return '';

  const kind = translate(lang, 'lib.kindWord');
  const m = /^(.*?)\s*도서관$/.exec(name.trim());
  const body = m && m[1] ? m[1] : name;

  // 이미 띄어 쓴 자리는 그대로 두고, 붙어 있는 덩어리만 다시 끊는다
  const spelled = body
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(splitWords)
    .map(romanize)
    .join(' ');

  return m && m[1] ? `${titleCase(spelled)} ${kind}` : titleCase(spelled);
}
