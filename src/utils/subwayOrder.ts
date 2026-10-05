import ORDER from '@/data/subwayOrder.json';

/**
 * 전광판의 "3전역 · 2전역 · 전역 · 이 역" — 노선 역 순서표(scripts/build-subway-order.mjs)에서 찾는다.
 *
 * 어느 쪽에서 열차가 오는지는
 *   1) 실시간 열차가 지금 있는 역(at)이 이 역 앞뒤 어디에 있는지, 없으면
 *   2) 종착역(toward)이 어느 쪽 끝에 있는지(그 반대편에서 온다)
 * 로 정한다. 순서표에 없는 노선·역(코레일 구간 등)은 null — 화면은 간단한 선로로 보여 준다.
 */
type Line = { circular: boolean; runs: string[][] };
const LINES = (ORDER as { lines: Record<string, Line> }).lines;

const norm = (n: string) => n.replace(/\s*\(.*\)\s*$/, '').replace(/역$/, '').replace(/\s+/g, '').trim();

export interface Approach {
  /** 오는 쪽 역 이름, 먼 역부터 (최대 3개) — [3전역, 2전역, 전역] */
  before: string[];
  /** 열차가 몇 정거장 전인지 (실시간 at 을 순서표에서 찾았을 때만) */
  away?: number;
}

export function approach(line: string, station: string, at?: string, toward?: string): Approach | null {
  const l = LINES[line];
  if (!l) return null;
  const me = norm(station);
  for (let ri = 0; ri < l.runs.length; ri++) {
    const run = l.runs[ri].map(norm);
    const i = run.indexOf(me);
    if (i < 0) continue;
    const ring = l.circular && ri === 0;
    const at_ = (k: number) => (ring ? run[(k + run.length) % run.length] : run[k]);
    const side = (dir: -1 | 1, n: number) => {
      const out: string[] = [];
      for (let k = 1; k <= n; k++) {
        const name = at_(i + dir * k);
        if (!name) break;
        out.push(name);
      }
      return out;
    };
    let from: -1 | 1 | null = null;
    let away: number | undefined;
    const a = at ? norm(at) : '';
    if (a === me) {
      away = 0;
    } else if (a) {
      for (const dir of [-1, 1] as const) {
        const k = side(dir, 12).indexOf(a);
        if (k >= 0) {
          from = dir;
          away = k + 1;
          break;
        }
      }
    }
    if (from === null && toward && !ring) {
      // 종착역이 오른쪽 끝(번호가 큰 쪽)에 있으면 열차는 왼쪽에서 온다
      const t = norm(toward);
      const tk = run.indexOf(t);
      if (tk >= 0 && tk !== i) from = tk > i ? -1 : 1;
    }
    if (from === null) return away === 0 ? { before: [], away } : null;
    // 이름은 실제 표기 그대로(괄호 없이) — 먼 역부터
    const before = side(from, 3)
      .map((n) => l.runs[ri].find((x) => norm(x) === n) ?? n)
      .reverse();
    return { before, away };
  }
  return null;
}
