/**
 * 슬라이스들을 한 장의 PNG 로 합친다 (확인용).
 *   node scripts/montage-slices.mjs <시작번호> <끝번호> [출력파일]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets/mascot/slices');

const from = Number(process.argv[2] ?? 1);
const to = Number(process.argv[3] ?? 99);
const outFile = process.argv[4] ?? 'assets/mascot/montage.png';

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.png'))
  .map((f) => ({ f, n: Number(f.match(/(\d+)/)[1]) }))
  .filter((x) => x.n >= from && x.n <= to)
  .sort((a, b) => a.n - b.n);

if (files.length === 0) {
  console.error('해당 범위의 슬라이스가 없습니다.');
  process.exit(1);
}

const CELL = 200; // 셀 한 변
const COLS = Math.min(6, files.length);
const ROWS = Math.ceil(files.length / COLS);
const LABEL = 22; // 번호를 적을 아래 여백

const out = new PNG({ width: COLS * CELL, height: ROWS * (CELL + LABEL) });
// 흰 배경 (투명이면 캐릭터가 안 보인다)
for (let i = 0; i < out.width * out.height; i++) {
  out.data[i * 4] = 255;
  out.data[i * 4 + 1] = 255;
  out.data[i * 4 + 2] = 255;
  out.data[i * 4 + 3] = 255;
}

/** 3x5 도트 숫자 폰트 - 번호를 그려 넣기 위한 최소 구현 */
const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

function drawDigit(ch, ox, oy, scale) {
  const g = DIGITS[ch];
  if (!g) return;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      if (g[r][c] !== '1') continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = ox + c * scale + dx;
          const y = oy + r * scale + dy;
          if (x < 0 || y < 0 || x >= out.width || y >= out.height) continue;
          const i = (y * out.width + x) * 4;
          out.data[i] = 20;
          out.data[i + 1] = 20;
          out.data[i + 2] = 20;
        }
      }
    }
  }
}

files.forEach(({ f, n }, idx) => {
  const src = PNG.sync.read(fs.readFileSync(path.join(DIR, f)));
  const col = idx % COLS;
  const row = (idx / COLS) | 0;
  const baseX = col * CELL;
  const baseY = row * (CELL + LABEL);

  // 셀 크기에 맞춰 최근접 이웃으로 축소
  const scale = Math.min(CELL / src.width, CELL / src.height);
  const dw = Math.floor(src.width * scale);
  const dh = Math.floor(src.height * scale);
  const offX = baseX + ((CELL - dw) / 2 | 0);
  const offY = baseY + ((CELL - dh) / 2 | 0);

  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(src.width - 1, (x / scale) | 0);
      const sy = Math.min(src.height - 1, (y / scale) | 0);
      const si = (sy * src.width + sx) * 4;
      const a = src.data[si + 3] / 255;
      if (a === 0) continue;
      const di = ((offY + y) * out.width + (offX + x)) * 4;
      // 흰 배경 위에 알파 합성
      out.data[di] = src.data[si] * a + 255 * (1 - a);
      out.data[di + 1] = src.data[si + 1] * a + 255 * (1 - a);
      out.data[di + 2] = src.data[si + 2] * a + 255 * (1 - a);
    }
  }

  const label = String(n).padStart(2, '0');
  let x = baseX + CELL / 2 - label.length * 8;
  for (const ch of label) {
    drawDigit(ch, x, baseY + CELL + 4, 3);
    x += 12;
  }
});

fs.writeFileSync(path.resolve(ROOT, outFile), PNG.sync.write(out));
console.log(`✓ ${files.length}장 합침 → ${outFile} (${out.width}×${out.height})`);
