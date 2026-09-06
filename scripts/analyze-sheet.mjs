/** 시트의 알파 분포와 실제 여백 폭을 재 본다. 분할 파라미터를 정하기 위한 일회성 도구. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const png = PNG.sync.read(fs.readFileSync(path.resolve(ROOT, process.argv[2])));
const { width: W, height: H, data } = png;

// 알파 히스토그램
const hist = new Array(9).fill(0);
for (let i = 0; i < W * H; i++) hist[Math.min(8, Math.floor(data[i * 4 + 3] / 32))]++;
console.log(`크기 ${W}×${H}`);
console.log('알파 분포 (0-31, 32-63, ...):');
hist.forEach((n, i) => console.log(`  ${i * 32}-${i * 32 + 31}: ${((n / (W * H)) * 100).toFixed(1)}%`));

// 임계값별 전경 비율
for (const t of [1, 8, 24, 64, 128]) {
  let n = 0;
  for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] >= t) n++;
  console.log(`알파>=${t} 전경 비율: ${((n / (W * H)) * 100).toFixed(1)}%`);
}

// 세로 투영 → 빈 열(column) 구간 길이 분포
const T = 24;
const colHas = new Uint8Array(W);
const rowHas = new Uint8Array(H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (data[(y * W + x) * 4 + 3] >= T) {
      colHas[x] = 1;
      rowHas[y] = 1;
    }

function gaps(arr) {
  const out = [];
  let run = 0;
  for (let i = 0; i < arr.length; i++) {
    if (!arr[i]) run++;
    else {
      if (run > 0) out.push(run);
      run = 0;
    }
  }
  if (run > 0) out.push(run);
  return out;
}

const cg = gaps(colHas).sort((a, b) => a - b);
const rg = gaps(rowHas).sort((a, b) => a - b);
console.log(`\n빈 열 구간 ${cg.length}개:`, cg.join(', '));
console.log(`빈 행 구간 ${rg.length}개:`, rg.join(', '));
