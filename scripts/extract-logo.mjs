/**
 * 시트 4번째 줄에 있는 「달곰이 / Dalgomi」 배너 로고를 낱장으로 뽑아낸다.
 *
 *   node scripts/extract-logo.mjs
 *
 * slice-mascot-sheet 는 그 칸을 배너 + 하트·느낌표·물음표·말풍선이 뭉친
 * 한 덩어리로 잘라 놓는다. 그 안에서 행 투영으로 다시 나눠 맨 윗줄(배너)만 취한다.
 * 결과는 assets/mascot/poses/dalgomi-logo.png (커밋 대상).
 */

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { ROOT } from './lib/env.mjs';

const input = process.argv[2] ?? 'assets/mascot/slices/slice-27.png';
const src = path.resolve(ROOT, input);

if (!fs.existsSync(src)) {
  console.error(`파일이 없습니다: ${src}\n먼저 npm run slice-mascot 을 돌리세요.`);
  process.exit(1);
}

const png = PNG.sync.read(fs.readFileSync(src));
const { width: W, height: H, data } = png;
const ALPHA = 24;

// 행 투영 → 내용이 있는 가로 띠들
const rows = [];
for (let y = 0; y < H; y++) {
  let n = 0;
  for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] >= ALPHA) n++;
  rows.push(n);
}

const bands = [];
let start = -1;
for (let y = 0; y <= H; y++) {
  const on = y < H && rows[y] > 2;
  if (on && start === -1) start = y;
  if (!on && start !== -1) {
    if (y - start >= 12) bands.push([start, y - 1]);
    start = -1;
  }
}

if (bands.length === 0) {
  console.error('내용을 찾지 못했습니다.');
  process.exit(1);
}

/**
 * 로고는 두 줄이다 — 위: 「달곰이」+ 나뭇잎, 아래: 리본 배너의 「Dalgomi」.
 * 그 아래 셋째 줄(하트·느낌표·물음표·말풍선)은 로고가 아니므로 뺀다.
 */
const TAKE = Number(process.argv[3] ?? 2);
const used = bands.slice(0, TAKE);
console.log(`가로 띠 ${bands.length}개 중 위에서 ${used.length}줄을 로고로 사용`);

const y0 = used[0][0];
const y1 = used[used.length - 1][1];

// 그 띠 안에서 실제 경계상자
let tx0 = W, tx1 = 0;
for (let y = y0; y <= y1; y++) {
  for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] < ALPHA) continue;
    if (x < tx0) tx0 = x;
    if (x > tx1) tx1 = x;
  }
}

const PAD = 8;
const w = tx1 - tx0 + 1 + PAD * 2;
const h = y1 - y0 + 1 + PAD * 2;
const out = new PNG({ width: w, height: h });
out.data.fill(0);

for (let y = y0; y <= y1; y++) {
  for (let x = tx0; x <= tx1; x++) {
    const si = (y * W + x) * 4;
    const di = ((y - y0 + PAD) * w + (x - tx0 + PAD)) * 4;
    out.data[di] = data[si];
    out.data[di + 1] = data[si + 1];
    out.data[di + 2] = data[si + 2];
    out.data[di + 3] = data[si + 3];
  }
}

const dest = path.join(ROOT, 'assets/mascot/poses/dalgomi-logo.png');
fs.writeFileSync(dest, PNG.sync.write(out));
console.log(`✓ ${w}×${h} → assets/mascot/poses/dalgomi-logo.png`);
