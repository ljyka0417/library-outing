/**
 * 도서관 이름 매칭 로직.
 *
 * geocode(카카오)와 enrich(정보나루) 양쪽에서 같은 규칙을 쓴다.
 * 처음엔 enrich 만 "이름 완전일치"를 쓰다가 132곳 중 36곳밖에 못 잡았다.
 * 한국 도서관 이름은 '시립'·'광역시'·'시' 가 붙었다 말았다 해서
 * 완전일치로는 태반이 어긋난다.
 */

/** 괄호·공백·구분자 제거 */
export const norm = (s = '') =>
  s.replace(/\(.*?\)/g, '').replace(/[\s·\-_]/g, '').toLowerCase();

/** 행정 수식어까지 제거. "고양시립 화정도서관" ≈ "고양화정도서관" 으로 보기 위함 */
const ADMIN_WORDS =
  /(특별자치도|특별자치시|광역시|특별시|통합특별시|교육청|시립|도립|군립|구립|공립)/g;
export const strip = (s = '') => norm(s).replace(ADMIN_WORDS, '');

/**
 * 이름 유사도 (0~1). 글자 2개씩 끊어 겹치는 비율 — Dice 계수.
 * "안산미디어도서관" vs "안산시 미디어도서관" 같은 차이를 흡수한다.
 */
export function similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s) => {
    const out = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };

  const A = bigrams(a);
  const B = bigrams(b);
  let hits = 0;
  for (const [g, n] of A) hits += Math.min(n, B.get(g) ?? 0);

  const total =
    [...A.values()].reduce((x, y) => x + y, 0) + [...B.values()].reduce((x, y) => x + y, 0);
  return (2 * hits) / total;
}

/**
 * 우리 지역 분류 → 주소에 실제로 쓰이는 표기들.
 * ⚠️ 최신 행정구역명도 함께 넣는다. 광주는 '전남광주통합특별시' 로 나오는 데이터가 있다.
 */
export const SIDO_PREFIXES = {
  서울: ['서울'],
  경기: ['경기'],
  인천: ['인천'],
  강원: ['강원'],
  충청: ['충북', '충청북도', '충남', '충청남도'],
  대전: ['대전'],
  세종: ['세종'],
  전라: ['전북', '전라북도', '전남', '전라남도', '전남광주통합특별시'],
  광주: ['광주', '전남광주통합특별시'],
  경상: ['경북', '경상북도', '경남', '경상남도'],
  대구: ['대구'],
  울산: ['울산'],
  부산: ['부산'],
  제주: ['제주'],
};

export function regionMatches(address = '', sido) {
  const prefixes = SIDO_PREFIXES[sido] ?? [sido];
  return prefixes.some((p) => address.startsWith(p));
}

/**
 * 후보가 이 도서관일 가능성을 점수로 매긴다.
 *
 * @param cand  { name, address }
 * @param seed  { name, sido, sigungu }
 * @param seedNames  우리 목록 전체의 strip 된 이름 집합 (다른 도서관 오매칭 방지)
 */
export function scoreCandidate(cand, seed, seedNames) {
  let s = 0;
  const addr = cand.address ?? '';

  // 지역이 맞는지가 제일 중요하다
  if (regionMatches(addr, seed.sido)) s += 50;
  else s -= 40;

  if (seed.sigungu && addr.includes(seed.sigungu)) s += 15;

  const sim = Math.max(
    similarity(norm(cand.name), norm(seed.name)),
    similarity(strip(cand.name), strip(seed.name))
  );
  if (sim >= 0.95) s += 45;
  else if (sim >= 0.8) s += 35;
  else if (sim >= 0.62) s += 22;
  else if (sim >= 0.45) s += 5;
  else s -= 25;

  // 우리 목록의 *다른* 도서관 이름과 정확히 같으면 그 도서관이지 이 도서관이 아니다
  const sp = strip(cand.name);
  if (seedNames && sp !== strip(seed.name) && seedNames.has(sp)) s -= 45;

  return { score: s, similarity: sim };
}

/**
 * 이름만으로 "같은 곳"이라고 인정하는 기준.
 *
 * 점수만 보면 지역 가산점(+50)이 이름 부족을 덮어버린다. 실제로
 * "국립중앙도서관" 이 "강동중앙도서관" 에 붙는 사고가 났다 — 둘 다 서울이고
 * '중앙도서관' 이 겹쳐서 72점으로 통과한 것.
 *
 * 유사도 0.70~0.78 구간이 특히 위험한데, 여기엔 맞는 것과 틀린 것이 섞여 있다.
 *   맞음: 배방도서관 ↔ 아산시 배방도서관 / 무등도서관 ↔ 광주광역시립무등도서관
 *   틀림: 경기도서관 ↔ 경기도교육청과천도서관 / 송도국제도서관 ↔ 송도국제기구도서관
 *
 * 둘을 가르는 건 **포함 관계**다. 행정 수식어만 앞뒤로 붙은 경우는 우리 이름이
 * 상대 이름 안에 통째로 들어 있지만, 다른 도서관은 중간에 다른 말이 끼어든다.
 * 그래서 "유사도가 아주 높거나(0.85+), 이름이 통째로 포함되거나" 를 조건으로 건다.
 */
const HIGH_SIMILARITY = 0.85;

/** 한쪽 이름이 다른 쪽에 통째로 들어 있는가 (행정 수식어 제거 후) */
function containsName(a, b) {
  const x = strip(a);
  const y = strip(b);
  if (x.length < 4 || y.length < 4) return false;
  return x.includes(y) || y.includes(x);
}

/** 후보 목록에서 가장 그럴듯한 하나를 고른다. 확신이 부족하면 null. */
export function pickBest(candidates, seed, seedNames, threshold = 60) {
  let best = null;
  for (const cand of candidates) {
    const { score, similarity: sim } = scoreCandidate(cand, seed, seedNames);
    if (!best || score > best.score) best = { cand, score, similarity: sim };
  }
  if (!best || best.score < threshold) return { picked: null, best };

  const nameOk = best.similarity >= HIGH_SIMILARITY || containsName(best.cand.name, seed.name);
  if (!nameOk) return { picked: null, best };

  return { picked: best, best };
}
