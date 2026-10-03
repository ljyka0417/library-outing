/**
 * 정보나루 도서 목록의 서지 표기를 화면용 제목·저자로 다듬는다.
 * collect-books(도서관별 순위)와 collect-region-books(지역별 순위)가 같은 규칙을 쓴다.
 */

/**
 * 앞머리 괄호를 처리한다.
 *
 *   "(추리 천재) 엉덩이 탐정"      → "엉덩이 탐정"    보조서명이라 떼는 게 자연스럽다
 *   "(The) boy in the dress"      → "The boy in the dress"  관사는 제목의 일부다
 *   "(쿠폰가 99,000원) 어스본 리딩" → "어스본 리딩"   서점 문구가 섞여 들어온 것
 */
function unwrapLeadingParen(s) {
  const m = s.match(/^\(([^)]*)\)\s*(.+)$/);
  if (!m) return s;
  const [, inside, rest] = m;
  return /^(the|a|an)$/i.test(inside.trim()) ? `${inside.trim()} ${rest}` : rest;
}

/**
 * 서지 표기를 걷어내고 책 제목만 남긴다.
 *
 * 도서관 목록 데이터는 MARC 관례를 따라 한 필드에 여러 정보를 이어 붙인다:
 *   :  부제        "아몬드 :손원평 장편소설"
 *   =  병렬서명    "종의 기원 =The origin of species"
 *   /  저자사항    "종의 기원 /정유정 지음"
 *
 * short 는 부제까지 버린 짧은 제목, full 은 부제를 남긴 긴 제목이다.
 * 평소엔 short 를 쓰지만, 한 도서관 목록 안에서 short 가 겹치면
 * (예: "Oxford Reading Tree" 네 권) 부제가 유일한 구별 수단이므로 full 로 올린다.
 */
export function titleForms(raw = '') {
  const noAuthor = raw.split(/\s*\/\s*/)[0];
  const tidy = (s) =>
    unwrapLeadingParen(s.trim())
      .replace(/\s*\(.*?\)\s*$/, '')
      // 서점 묶음 표기: "쿠키런 과학상식 1~35 세트 - 전35권" → "쿠키런 과학상식 1~35 세트"
      .replace(/\s*-\s*전\s*\d+\s*권\s*$/, '')
      .replace(/\s*[.,;]\s*$/, '')
      .trim();
  // 병렬서명(= 뒤)은 같은 책의 번역 제목이라 구별에 쓸모가 없다. 부제만 남긴다.
  const noParallel = noAuthor.split(/\s*=\s*/)[0];
  return {
    short: tidy(noParallel.split(/\s*[:：]\s*/)[0]),
    full: tidy(noParallel.replace(/\s*[:：]\s*/g, ': ')),
  };
}

/**
 * 그래도 제목이 겹치면 권 번호로 가른다.
 *
 * vol 을 언제나 붙이지는 않는다. 이 필드에는 권수가 아닌 값도 자주 들어온다.
 * "만복이네 떡집" 한 권짜리에 vol 이 354 로 와서 "만복이네 떡집 354권" 이
 * 되어 버린 적이 있다. 겹칠 때만 쓰면 그런 값이 화면에 나오지 않는다.
 */
export function disambiguate(books) {
  const count = (key) =>
    books.reduce((m, b) => m.set(b[key], (m.get(b[key]) ?? 0) + 1), new Map());

  const shortCount = count('short');
  for (const b of books) {
    b.title = shortCount.get(b.short) > 1 ? b.full : b.short;
  }

  const titleCount = books.reduce(
    (m, b) => m.set(b.title, (m.get(b.title) ?? 0) + 1),
    new Map()
  );
  for (const b of books) {
    if (titleCount.get(b.title) > 1 && b.vol) b.title = `${b.title} ${b.vol}권`;
  }

  /*
   * 여기까지 와도 제목이 똑같이 남는 줄이 있다. 권수를 안 알려 주는 자료가
   * 섞이기 때문이다. 강서도서관 가양관은 「흔한남매」가 넉 줄이었는데, ISBN 은
   * 다 달랐지만 화면에는 같은 제목 네 개가 나란히 찍혔다 — 고장 난 것처럼 보인다.
   *
   * 번호를 붙여 줄 수는 없다. 몇 권인지 모르는 채로 "3권" 이라고 쓰면 없는
   * 사실을 지어내는 것이다. 그래서 구별할 수 없는 줄은 앞의 하나만 남긴다.
   * 여덟 줄 중 넷이 똑같은 것보다, 다섯 줄이라도 서로 다른 편이 낫다.
   */
  const seen = new Set();
  return books.filter((b) => {
    if (seen.has(b.title)) return false;
    seen.add(b.title);
    return true;
  });
}

/** "지은이: 한강 ;옮긴이: 양윤옥" → "한강" */
export function cleanAuthor(raw = '') {
  // 여러 사람이면 첫 사람만: "임우영 (지은이), 이태영 (그림)" → "임우영"
  const first = raw.split(/\s*[;；,，]\s*/)[0];
  return first
    .replace(/^(지은이|글|저자|엮은이|원작)\s*[:：]\s*/, '')
    // 괄호 속 역할·영문 표기: "한로로 (HANRORO) (지은이)" → "한로로"
    .replace(/\s*\([^)]*\)/g, '')
    // 끝에 붙은 역할 낱말: "앤디 위어 지음" → "앤디 위어"
    .replace(/\s*(글·그림|지음|저|글|엮음|원작|著)\s*$/, '')
    .trim();
}
