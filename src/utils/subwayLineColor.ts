/**
 * 지하철·전철 노선 고유색 — 역 안내판·노선도에 쓰는 색. 노선 이름은 카카오 장소 이름 그대로
 * ("2호선" · "부산1호선" · "경의중앙선" …). 서울 1~9호선은 앞에 도시 이름이 붙지 않는다.
 *
 * 도서관 127곳 근처에 나오는 노선은 `node scripts/scan-subway-lines.mjs` 로 확인한다 (빠진 색이 있으면 알려 준다).
 * 글자는 실제 역 안내판처럼 모두 흰색. 밝은 색(9호선 금색·수인분당선 노랑 …)은 흰 글자가 흐려서
 * shadow 가 true — 글자에 옅은 그림자를 넣어 윤곽을 세운다(색은 공식 색 그대로).
 */
type LineColor = { bg: string; fg: string; shadow?: boolean };
const W = '#FFFFFF';

const COLORS: Record<string, LineColor> = {
  // 서울·수도권
  '1호선': { bg: '#0052A4', fg: W },
  '2호선': { bg: '#00A84D', fg: W },
  '3호선': { bg: '#EF7C1C', fg: W },
  '4호선': { bg: '#00A5DE', fg: W },
  '5호선': { bg: '#996CAC', fg: W },
  '6호선': { bg: '#CD7C2F', fg: W },
  '7호선': { bg: '#747F00', fg: W },
  '8호선': { bg: '#E6186C', fg: W },
  '9호선': { bg: '#BDB092', fg: W },
  경의중앙선: { bg: '#77C4A3', fg: W },
  중앙선: { bg: '#77C4A3', fg: W },
  공항철도: { bg: '#0090D2', fg: W },
  경춘선: { bg: '#0C8E72', fg: W },
  수인분당선: { bg: '#FABE00', fg: W },
  신분당선: { bg: '#D4003B', fg: W },
  경강선: { bg: '#0054A6', fg: W },
  서해선: { bg: '#8FC31F', fg: W },
  우이신설선: { bg: '#B0CE18', fg: W },
  신림선: { bg: '#6789CA', fg: W },
  김포골드라인: { bg: '#AD8605', fg: W },
  에버라인: { bg: '#56AD2D', fg: W },
  용인에버라인: { bg: '#56AD2D', fg: W },
  의정부경전철: { bg: '#FDA600', fg: W },
  인천1호선: { bg: '#7CA8D5', fg: W },
  인천2호선: { bg: '#ED8B00', fg: W },
  'GTX-A': { bg: '#9A6292', fg: W },
  // 부산·울산·경남
  부산1호선: { bg: '#F06A00', fg: W },
  부산2호선: { bg: '#81BF48', fg: W },
  부산3호선: { bg: '#BB8C00', fg: W },
  부산4호선: { bg: '#217DCB', fg: W },
  부산김해경전철: { bg: '#8652A1', fg: W },
  동해선: { bg: '#0054A6', fg: W },
  // 대구
  대구1호선: { bg: '#D93F5C', fg: W },
  대구2호선: { bg: '#00AA80', fg: W },
  대구3호선: { bg: '#FFB100', fg: W },
  // 광주 · 대전
  광주1호선: { bg: '#009088', fg: W },
  대전1호선: { bg: '#007448', fg: W },
};

/** 흰 글자와의 대비(WCAG). 3 미만이면 그림자를 넣는다 */
function whiteContrast(hex: string) {
  const ch = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 1.05 / (0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2] + 0.05);
}

export function lineColor(line: string): LineColor | null {
  const name = line.trim();
  const c = COLORS[name] ?? COLORS[name.replace(/\s+/g, '')];
  return c ? { ...c, shadow: whiteContrast(c.bg) < 3 } : null;
}
