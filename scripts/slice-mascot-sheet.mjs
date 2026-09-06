/**
 * 달곰이 스프라이트 시트 자동 분할기
 *
 *   node scripts/slice-mascot-sheet.mjs assets/mascot/달곰이.png
 *
 * 격자로 배치된 시트 한 장을 포즈별 낱장 PNG 로 잘라낸다.
 *
 * 왜 투영(projection) 방식인가
 *   처음엔 연결 요소(connected component) 로 잡으려 했는데, 이 시트는 캐릭터끼리
 *   외곽선이 거의 닿아 있어서 GAP=0 으로도 30덩어리밖에 안 나왔다(실제는 45개+).
 *   격자 배치라면 "빈 행으로 가로 띠를 나누고, 띠 안에서 빈 열로 다시 나누는"
 *   투영 방식이 훨씬 정확하다.
 *
 *   1) 알파 마스크를 만든다
 *   2) 행 투영 → 전경이 있는 행 구간 = 가로 띠(band)
 *   3) 각 띠 안에서 열 투영 → 전경이 있는 열 구간 = 낱장 셀
 *   4) 셀 안의 실제 경계상자로 다시 다듬고, 정사각 캔버스에 담아 저장
 *   5) 확인용 contact sheet(HTML) 생성
 *
 * 안티에일리어싱 때문에 아주 옅은 픽셀이 셀 사이를 잇는 경우가 있어,
 * "픽셀 수가 NOISE 이하인 줄은 비어 있다고 본다" 는 여유를 둔다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ALPHA = 24; // 이 값 미만은 배경
const NOISE = 2; // 이 개수 이하의 전경 픽셀만 있는 행/열은 비었다고 본다
const MIN_BAND_H = 40; // 이보다 얇은 띠는 버린다
const MIN_CELL_W = 24; // 이보다 좁은 셀은 버린다
const PADDING = 10; // 잘라낸 뒤 사방 여백

const input = process.argv[2];
if (!input) {
  console.error('사용법: node scripts/slice-mascot-sheet.mjs <시트 PNG 경로>');
  process.exit(1);
}
const inputPath = path.resolve(ROOT, input);
if (!fs.existsSync(inputPath)) {
  console.error(`파일을 찾을 수 없습니다: ${inputPath}`);
  process.exit(1);
}

const png = PNG.sync.read(fs.readFileSync(inputPath));
const { width: W, height: H, data } = png;
console.log(`시트 ${W}×${H}`);

/* ── 1) 전경 마스크 ─────────────────────────────────────────── */
const fg = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) fg[i] = data[i * 4 + 3] >= ALPHA ? 1 : 0;

/** 값이 NOISE 를 넘는 구간들을 [start, end] 로 뽑는다 */
function runs(counts, minLen) {
  const out = [];
  let start = -1;
  for (let i = 0; i < counts.length; i++) {
    const on = counts[i] > NOISE;
    if (on && start === -1) start = i;
    if ((!on || i === counts.length - 1) && start !== -1) {
      const end = on ? i : i - 1;
      if (end - start + 1 >= minLen) out.push([start, end]);
      start = -1;
    }
  }
  return out;
}

/* ── 2) 행 투영 → 가로 띠 ───────────────────────────────────── */
const rowCounts = new Int32Array(H);
for (let y = 0; y < H; y++) {
  let n = 0;
  for (let x = 0; x < W; x++) if (fg[y * W + x]) n++;
  rowCounts[y] = n;
}
const bands = runs(rowCounts, MIN_BAND_H);
console.log(`가로 띠 ${bands.length}개`);

/* ── 3) 띠마다 열 투영 → 셀 ────────────────────────────────── */
const cells = [];
bands.forEach(([y0, y1], bi) => {
  const colCounts = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (fg[y * W + x]) n++;
    colCounts[x] = n;
  }
  const cols = runs(colCounts, MIN_CELL_W);
  console.log(`  띠 ${bi + 1} (y ${y0}~${y1}, 높이 ${y1 - y0 + 1}) → ${cols.length}칸`);
  for (const [x0, x1] of cols) cells.push({ x0, y0, x1, y1, band: bi + 1 });
});

console.log(`\n셀 ${cells.length}개`);

/* ── 4) 잘라내기 ────────────────────────────────────────────── */
const outDir = path.join(ROOT, 'assets/mascot/slices');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const results = [];

cells.forEach((cell, i) => {
  // 셀 안에서 실제 전경의 경계상자를 다시 구한다 (띠 높이는 이웃 때문에 넉넉하다)
  let tx0 = cell.x1,
    ty0 = cell.y1,
    tx1 = cell.x0,
    ty1 = cell.y0;
  for (let y = cell.y0; y <= cell.y1; y++) {
    for (let x = cell.x0; x <= cell.x1; x++) {
      if (!fg[y * W + x]) continue;
      if (x < tx0) tx0 = x;
      if (x > tx1) tx1 = x;
      if (y < ty0) ty0 = y;
      if (y > ty1) ty1 = y;
    }
  }
  if (tx1 < tx0 || ty1 < ty0) return;

  const w = tx1 - tx0 + 1;
  const h = ty1 - ty0 + 1;

  // 앱에서 <Image> 로 쓸 때 포즈마다 크기가 들쭉날쭉해지지 않도록 정사각 캔버스 중앙에
  const side = Math.max(w, h) + PADDING * 2;
  const out = new PNG({ width: side, height: side });
  out.data.fill(0);

  const offX = ((side - w) / 2) | 0;
  const offY = ((side - h) / 2) | 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = ((ty0 + y) * W + (tx0 + x)) * 4;
      const dst = ((offY + y) * side + (offX + x)) * 4;
      out.data[dst] = data[src];
      out.data[dst + 1] = data[src + 1];
      out.data[dst + 2] = data[src + 2];
      out.data[dst + 3] = data[src + 3];
    }
  }

  const name = `slice-${String(i + 1).padStart(2, '0')}.png`;
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(out));
  results.push({ name, w, h, band: cell.band });
});

/* ── 5) 확인용 contact sheet ────────────────────────────────── */
const byBand = [...new Set(results.map((r) => r.band))];

const html = `<!doctype html>
<meta charset="utf-8">
<title>달곰이 슬라이스 확인</title>
<style>
  body { margin:0; padding:32px; background:#FBF8F3;
         font-family:-apple-system,"Segoe UI","Malgun Gothic",sans-serif; color:#2E2A26; }
  h1 { font-size:22px; margin:0 0 4px; }
  p  { color:#7A7269; font-size:14px; margin:0 0 28px; }
  h2 { font-size:15px; margin:28px 0 12px; padding-bottom:6px; border-bottom:2px solid #EDE6DC; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:14px; }
  .cell { background:#fff; border:1px solid #EDE6DC; border-radius:14px; padding:10px; text-align:center; }
  .cell img { width:100%; height:auto; display:block; }
  .n { font-size:12px; font-weight:700; margin-top:8px; color:#4FA695; }
  .d { font-size:10px; color:#A79E93; }
</style>
<h1>달곰이 슬라이스 ${results.length}장</h1>
<p>원본: ${path.basename(inputPath)} · 각 조각의 번호를 보고 어떤 포즈인지 알려주세요.</p>
${byBand
  .map(
    (b) => `<h2>${b}번째 줄</h2>
<div class="grid">
${results
  .filter((r) => r.band === b)
  .map(
    (r) => `  <div class="cell">
    <img src="slices/${r.name}" alt="${r.name}">
    <div class="n">${r.name.replace('.png', '').replace('slice-', '')}</div>
    <div class="d">${r.w}×${r.h}</div>
  </div>`
  )
  .join('\n')}
</div>`
  )
  .join('\n')}`;

fs.writeFileSync(path.join(ROOT, 'assets/mascot/slices-preview.html'), html, 'utf8');

console.log(`✓ ${results.length}장 저장 → assets/mascot/slices/`);
console.log('  확인용: assets/mascot/slices-preview.html');
