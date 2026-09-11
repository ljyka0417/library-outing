/**
 * 운영시간 문구를 요일별 시각으로 바꾼다.
 *
 * 정보나루의 operatingTime 은 표준이 없는 자유 문장이다. 실제로 들어오는 모양:
 *   "평일 09:00~21:00, 주말 09:00~18:00"
 *   "오전 9시 ~ 오후 6시"
 *   "[종합자료실 09:00~22:00(평일) / 09:00~18:00(주말)] [어린이자료실 ...]"
 *   "화,수,금,토,일요일 : 10:00 ~18:00 / 목 : 10:00 ~ 20:00"
 *   "-"
 *
 * ⚠️ 못 읽겠으면 byDay 를 빈 배열로 둔다.
 *   그러면 화면에서 "운영중/운영종료" 배지를 아예 안 띄우고 원문만 보여준다.
 *   틀린 시각을 단정하느니 판정을 포기하는 편이 낫다 — 헛걸음하는 쪽이
 *   모르는 쪽보다 나쁘다.
 *
 * byDay 는 [일,월,화,수,목,금,토] 7칸. 각 칸은 { open, close } 분 단위이거나
 * 휴관이면 null.
 */

/** 자료를 긁어올 때 섞여 들어온 HTML 기호를 되돌린다 */
function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'");
}

/**
 * "9", "09", "9시", "오전 9시", "09:00", "9:30" 을 분으로.
 * 분 자리가 "000" 처럼 잘못 적힌 자료가 있어 두 자리만 취한다.
 */
function toMinutes(ampm, hour, minute) {
  let h = Number(hour);
  const m = minute ? Number(String(minute).slice(0, 2)) : 0;
  if (ampm === '오후' && h < 12) h += 12;
  if (ampm === '오전' && h === 12) h = 0;
  if (h > 24 || m > 59) return null;
  return h * 60 + m;
}

/** 한 구간 "09:00~18:00" / "오전 9시 ~ 오후 6시" / "09시-21시" */
const RANGE = new RegExp(
  '(오전|오후)?\\s*(\\d{1,2})\\s*(?::\\s*(\\d{1,3})|시)\\s*(?:분)?' + // 시작
    '\\s*[~\\-–—]\\s*' +
    '(오전|오후)?\\s*(\\d{1,2})\\s*(?::\\s*(\\d{1,3})|시)\\s*(?:분)?', // 끝
  'g'
);

/** 문장에서 시간 구간을 모두 뽑는다 (나온 위치도 같이) */
export function extractRanges(text) {
  const out = [];
  RANGE.lastIndex = 0;
  let m;
  while ((m = RANGE.exec(text)) !== null) {
    let open = toMinutes(m[1], m[2], m[3]);
    let close = toMinutes(m[4], m[5], m[6]);
    if (open === null || close === null) continue;

    /*
     * "9시~6시" 처럼 오전·오후 표시가 없고 끝나는 시각이 더 이른 경우,
     * 저녁 6시를 뜻한다고 본다. 새벽 6시에 닫는 도서관은 없다.
     */
    if (close <= open && close + 12 * 60 > open && !m[4]) close += 12 * 60;
    if (close <= open) continue;

    out.push({ open, close, index: m.index });
  }
  return out;
}

const DAY_INDEX = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

/**
 * 쉼표로 자르되 괄호 안은 건드리지 않는다.
 *
 * ⚠️ "평일(화~금) 09:00~22:00, 주말(토,일) 09:00~18:00" 에서 그냥 쉼표로
 *   자르면 "(토,일)" 이 쪼개져 "주말(토" 와 "일) 09:00~18:00" 이 된다.
 *   둘 다 요일을 못 읽어서 토·일이 통째로 휴관 처리됐다.
 */
function splitOutsideParens(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/**
 * 이 문장을 읽어도 되는가.
 *
 * ⚠️ 욕심내면 틀린 시각을 지어낸다. 확인해 보니 실제로 그랬다 —
 *   "종합자료실 09:00~22:00(주말 17:00), 어린이실 09:00~18:00(주말 17:00)"
 *   에서 어린이실 시간이 주말 시간으로 들어갔다.
 *   틀린 운영시간은 사람을 헛걸음시킨다. 애매하면 읽지 않는 편이 낫다.
 */
function tooComplex(text) {
  /*
   * 괄호 안에 **끝나는 시각만** 따로 적어 둔 예외 표기가 위험하다.
   *   "종합자료실 09:00~22:00(주말 17:00)" — 주말엔 17시에 닫는다는 뜻인데,
   *   이걸 놓치면 주말도 22시까지 여는 것으로 말하게 된다.
   *
   * 반대로 괄호 안이 온전한 시간대면 그냥 운영시간을 괄호에 넣은 것뿐이다.
   *   "평일 ( 09:00 ~ 22:00 ) / 주말 ( 09:00 ~ 18:00 )" — 이건 읽어도 된다.
   *   처음엔 괄호에 숫자만 있으면 다 버렸는데, 멀쩡한 문장까지 버렸다.
   */
  for (const paren of text.match(/\([^)]*\)/g) ?? []) {
    const hasTime = /\d{1,2}\s*(?::\s*\d{2}|시)/.test(paren);
    if (hasTime && extractRanges(paren).length === 0) return true;
  }
  // 자료실 이름이 셋 이상 나오면 어느 것이 대표인지 단정하기 어렵다
  const rooms = text.match(/(자료실|열람실|학습실|도서관|코너|간행물실|정보실)/g) ?? [];
  if (rooms.length >= 3) return true;
  return false;
}

/**
 * 자료실이 여럿 적힌 문장에서 **대표 구간**만 남긴다.
 *
 * "[종합자료실 09:00~22:00] [어린이자료실 09:00~18:00]" 에서 어느 쪽을
 * 그 도서관의 운영시간으로 볼 것인가 — 종합·일반자료실 쪽이다. 어린이실이나
 * 열람실은 따로 움직이는 부속 공간이고, 사람들이 "몇 시까지 해요?" 라고 물을 때
 * 궁금해하는 건 본관 자료실이다.
 *
 * 원문은 화면에 그대로 보여주므로, 여기서 고른 건 배지 판정에만 쓰인다.
 */
/** 본관 자료실을 가리키는 말 */
const MAIN_ROOM = /(종합자료실|일반자료실|문헌정보실|종합·|일반·)/;
/** 따로 움직이는 부속 공간. 이쪽 시간을 도서관 시간으로 삼으면 안 된다. */
const SIDE_ROOM = /(열람실|학습실|어린이|유아|디지털|멀티미디어|외국|정기간행물|참고|향토|나눔터)/;

function mainScope(label) {
  // 대괄호로 나뉘어 있으면 그 덩어리들을, 아니면 슬래시로 나눈다
  const chunks = label.includes('[')
    ? label.split(/\]\s*/).map((s) => s.replace(/^\s*\[/, ''))
    : label.split(/\s*\/\s*/);

  if (chunks.length <= 1) return label;

  const withTime = chunks.filter((c) => extractRanges(c).length > 0);
  if (withTime.length === 0) return label;

  /*
   * ⚠️ 요일로 나뉜 문장은 건드리지 않는다.
   *   "평일 09:00~21:00 / 주말 09:00~18:00" 에서 한 덩어리만 남기면
   *   나머지 요일 정보가 통째로 날아간다.
   *   자료실별로 나뉜 문장일 때만 대표를 고른다.
   */
  if (withTime.some((c) => daysOf(c).length > 0)) return label;

  /*
   * ⚠️ "일반열람실" 의 '일반' 에 속으면 안 된다.
   *   "09:00~18:00(자료실) / 07:00~22:00(일반열람실)" 에서 열람실을 고르면
   *   새벽 7시부터 문 연 것으로 나온다. 열람실은 자습 공간이라 따로 연다.
   *   그래서 부속 공간 이름이 든 덩어리는 먼저 제쳐 둔다.
   */
  const notSide = withTime.filter((c) => !SIDE_ROOM.test(c));
  const pool = notSide.length > 0 ? notSide : withTime;

  return pool.find((c) => MAIN_ROOM.test(c)) ?? pool[0];
}

/**
 * 한 도막 안에 시간이 여럿이면 대표 하나를 고른다.
 * "종합자료실(09시-21시), 어린이자료실(09시-18시)" → 종합 쪽.
 */
function preferredRange(text) {
  const ranges = extractRanges(text);
  if (ranges.length <= 1) return ranges[0] ?? null;

  // 각 시간 앞에 붙은 이름을 보고 부속 공간이면 건너뛴다
  for (const r of ranges) {
    const head = text.slice(Math.max(0, r.index - 20), r.index);
    if (!SIDE_ROOM.test(head)) return r;
  }
  return ranges[0];
}

const WEEKDAY_HINT = /(평일|주중|월~금|월-금|월~목|화~금|화-금|화요일\s*~\s*금요일)/;
const WEEKEND_HINT = /(주말|토일|토~일|토-일|토\s*[,·\/]\s*일|토요일|일요일)/;

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

/** 한 도막이 어느 요일들을 말하는지 읽는다. 모르겠으면 빈 배열. */
function daysOf(text) {
  const days = new Set();

  // "화요일~금요일", "화-금" 같은 범위
  const span = /([일월화수목금토])요일?\s*[~\-–]\s*([일월화수목금토])요일?/.exec(text);
  if (span) {
    let i = DAY_INDEX[span[1]];
    const end = DAY_INDEX[span[2]];
    for (let n = 0; n < 7; n++) {
      days.add(i);
      if (i === end) break;
      i = (i + 1) % 7;
    }
    return [...days];
  }

  /*
   * "화,수,금,토,일요일" 이나 "주말(토,일)" 처럼 나열한 경우.
   *
   * ⚠️ "토요일" 의 '일' 을 일요일로 세면 안 된다. 그래서 '요일' 이 붙은 쪽을
   *   먼저 통째로 집어삼키게 해 두었다. 그리고 닫는 괄호 앞도 받아야 한다 —
   *   "(토,일)" 의 '일' 을 놓쳐서 일요일이 휴관으로 나온 적이 있다.
   */
  // 여는 괄호 앞도 받는다 — "토,일(9:00~18:00)" 에서 일요일을 놓친 적이 있다
  const LIST = /([일월화수목금토])요일|([일월화수목금토])(?=\s*[,·)(]|\s*:|\s+\d|\s*$)/g;
  let m;
  while ((m = LIST.exec(text)) !== null) {
    days.add(DAY_INDEX[m[1] ?? m[2]]);
  }
  if (days.size > 0) return [...days];

  // 평일 / 주말
  if (WEEKDAY_HINT.test(text)) return WEEKDAYS;
  if (WEEKEND_HINT.test(text)) return WEEKEND;
  return [];
}

/**
 * 문장을 도막으로 잘라 "이 요일들은 이 시간" 을 모은다.
 *
 * ⚠️ 요일 표시가 시간 앞에 오기도 하고 뒤에 오기도 한다.
 *   "평일 09:00~21:00" 과 "09:00~22:00(평일)" 이 둘 다 흔하다.
 *   그래서 시간과 표시의 거리로 짝짓지 않고, **도막 단위로** 본다.
 *   한 도막 안에 있으면 그 도막의 요일 표시를 그 시간에 붙인다.
 *   거리로 짝지었더니 "(평일)" 이 뒤에 붙은 문장에서 평일·주말이 같은
 *   시간대로 뭉쳐 판정을 포기하게 됐다.
 */
function collectByDay(scope) {
  const byDay = new Array(7).fill(undefined);
  let filled = 0;
  let sawRange = false;

  /*
   * ⚠️ 쉼표로 먼저 쪼개면 안 된다.
   *   "화,수,금,토,일요일 : 10:00~18:00" 은 요일을 쉼표로 나열한 것이라
   *   쪼개면 요일 목록이 조각난다. 반대로 "평일 09:00~21:00, 주말 09:00~18:00"
   *   은 쉼표가 절을 나눈다.
   *   둘을 가르는 건 시간대 개수다 — 슬래시로 먼저 나누고, 그 도막 안에
   *   시간대가 둘 이상일 때만 쉼표로 더 나눈다.
   */
  const parts = scope
    .split(/\s*\/\s*/)
    .flatMap((p) => (extractRanges(p).length > 1 ? splitOutsideParens(p) : [p]));

  for (const part of parts) {
    const ranges = extractRanges(part);
    if (ranges.length === 0) continue;
    sawRange = true;

    /*
     * ⚠️ 한 도막에 시간이 둘 이상 남아 있으면 포기한다.
     *   "토 09:00~20:00 일요일 09:00~18:00" 처럼 구분자 없이 이어 붙인
     *   문장은 어느 시간이 어느 요일인지 가를 수가 없다. 실제로 토요일
     *   시간을 일요일에 붙이는 사고가 났다.
     */
    if (ranges.length > 1) return null;

    /*
     * ⚠️ 요일이 안 적힌 시간대가 하나라도 있으면 포기한다.
     *   "주말/공휴일 09:00~18:00" 을 슬래시로 자르면 "공휴일 09:00~18:00"
     *   만 남아 요일을 못 읽는다. 그걸 그냥 건너뛰었더니 토·일이 통째로
     *   휴관으로 나왔다. 못 읽은 조각이 있으면 문장 전체를 포기하는 게 맞다.
     */
    const days = daysOf(part);
    if (days.length === 0) return null;

    for (const d of days) {
      if (byDay[d] === undefined) {
        byDay[d] = { open: ranges[0].open, close: ranges[0].close };
        filled++;
      }
    }
  }

  if (!sawRange || filled === 0) return null;

  /*
   * 이레 중 엿새는 채워져야 받아들인다.
   * 하루가 비는 건 대개 휴관일이라 자연스럽다 —
   * "화요일~금요일 …, 토요일 …, 일요일 …" 에는 월요일이 아예 안 나온다.
   * 두 날 이상 비면 문장을 덜 읽은 것이므로 포기한다.
   */
  if (filled < 6) return null;

  return byDay.map((v) => (v === undefined ? null : v));
}

export function parseHours(raw) {
  if (!raw) return undefined;

  const label = decodeEntities(raw).replace(/\s+/g, ' ').trim();
  if (!label || !/\d/.test(label)) return { label, byDay: [] };

  /*
   * 계절에 따라 다른 곳은 판정하지 않는다.
   * "06:00~23:00(하절기), 07:00~23:00(동절기)" 에서 지금이 어느 철인지
   * 문장만 보고는 알 수 없다. 반년 동안 틀린 시각을 말하게 된다.
   */
  if (/(하절기|동절기|하계|동계)/.test(label)) return { label, byDay: [] };

  const scope = mainScope(label);
  const ranges = extractRanges(scope);
  if (ranges.length === 0) return { label, byDay: [] };

  // 문장이 복잡하면 시간대가 하나로 보여도 읽지 않는다.
  // 괄호 안에 "(토,일요일-17:00)" 처럼 예외가 숨어 있을 수 있다.
  if (tooComplex(scope)) return { label, byDay: [] };

  // 1) 시간대가 하나뿐이면 전 요일 같다고 본다
  if (ranges.length === 1) {
    const { open, close } = ranges[0];
    return { label, byDay: Array.from({ length: 7 }, () => ({ open, close })) };
  }

  // 2) 도막마다 적힌 요일을 읽어 채운다
  const byDay = collectByDay(scope);
  if (byDay) return { label, byDay };

  /*
   * 3) 요일 표시가 한쪽에만 있는 경우.
   *    "09:00 ~ 18:00, 토/일요일 09:00 ~ 17:00" — 앞이 평일이라는 말은
   *    어디에도 없지만, 주말을 따로 떼어 적었으니 나머지가 평일이다.
   */
  const we = scope.search(WEEKEND_HINT);
  if (we > 0 && ranges.length === 2) {
    const before = ranges.filter((r) => r.index < we);
    const after = ranges.filter((r) => r.index >= we);
    if (before.length >= 1 && after.length >= 1) {
      const W = { open: before[0].open, close: before[0].close };
      const E = { open: after[0].open, close: after[0].close };
      return { label, byDay: [E, W, W, W, W, W, E] }; // 일 월 화 수 목 금 토
    }
  }

  // 4) 여럿인데 어느 요일인지 못 가르겠으면 판정을 포기한다
  return { label, byDay: [] };
}

/** 휴관일 문구에서 쉬는 요일을 뽑아 byDay 에 반영 */
const DAY_TOKENS = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
export function applyClosedDays(hours, closedText) {
  if (!hours?.byDay?.length || !closedText) return hours;
  const text = decodeEntities(closedText);
  for (const [ch, idx] of Object.entries(DAY_TOKENS)) {
    if (new RegExp(`매주\\s*${ch}`).test(text)) hours.byDay[idx] = null;
  }
  return hours;
}
