/**
 * 달곰이로 앱 아이콘·스플래시 이미지를 만든다.
 *
 *   npm run app-images
 *
 * 만드는 것
 *   assets/splash.png         1284×2778  시작 화면 (손 흔드는 달곰이)
 *   assets/icon.png           1024×1024  iOS 홈 화면 아이콘 (얼굴)
 *   assets/adaptive-icon.png  1024×1024  Android. 원/사각 등으로 잘리므로
 *                                        가운데 66% 안전영역 안에만 그린다
 *
 * ⚠️ 해상도 한계
 *   원본 시트가 1536×1024 라 캐릭터 한 마리가 180~270px 밖에 안 된다.
 *   1024px 아이콘으로 키우면 3~5배 확대라 가장자리가 뭉개진다.
 *   시트를 3배(4608×3072)로 다시 내보낸 뒤 npm run slice-mascot → 이 스크립트를
 *   다시 돌리면 선명해진다. 그때까지는 임시본으로 쓴다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { ROOT } from './lib/env.mjs';

const POSES = path.join(ROOT, 'assets/mascot/poses');
const OUT = path.join(ROOT, 'assets');

/** 앱 배경색 (theme 의 colors.background 와 같아야 이음매가 안 보인다) */
const BG = { r: 0xfb, g: 0xf8, b: 0xf3 };
/** 아이콘 배경 - 달곰이 스카프의 초록을 옅게 깐 색 */
const ICON_BG = { r: 0xe3, g: 0xf2, b: 0xee };

function read(name) {
  const p = path.join(POSES, name);
  if (!fs.existsSync(p)) {
    console.error(`포즈 파일이 없습니다: ${p}\n먼저 npm run slice-mascot 을 돌리세요.`);
    process.exit(1);
  }
  return PNG.sync.read(fs.readFileSync(p));
}

/**
 * 이중선형 보간(bilinear) 축소·확대.
 * 최근접이웃으로 키우면 계단이 그대로 보인다. 원본이 작아서 어차피 부드럽진
 * 않지만, 보간을 넣으면 확대 시 훨씬 덜 거슬린다.
 */
function resize(src, dw, dh) {
  const out = new PNG({ width: dw, height: dh });
  const { width: sw, height: sh, data } = src;

  for (let y = 0; y < dh; y++) {
    const sy = ((y + 0.5) * sh) / dh - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const fy = Math.min(1, Math.max(0, sy - y0));

    for (let x = 0; x < dw; x++) {
      const sx = ((x + 0.5) * sw) / dw - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const fx = Math.min(1, Math.max(0, sx - x0));

      const di = (y * dw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = data[(y0 * sw + x0) * 4 + c];
        const p10 = data[(y0 * sw + x1) * 4 + c];
        const p01 = data[(y1 * sw + x0) * 4 + c];
        const p11 = data[(y1 * sw + x1) * 4 + c];
        const top = p00 + (p10 - p00) * fx;
        const bot = p01 + (p11 - p01) * fx;
        out.data[di + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return out;
}

/** 단색으로 채운 캔버스 (불투명) */
function canvas(w, h, color) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    png.data[i * 4] = color.r;
    png.data[i * 4 + 1] = color.g;
    png.data[i * 4 + 2] = color.b;
    png.data[i * 4 + 3] = 255;
  }
  return png;
}

/** src 를 dst 위 (ox, oy) 에 알파 합성 */
function composite(dst, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    const dy = oy + y;
    if (dy < 0 || dy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = ox + x;
      if (dx < 0 || dx >= dst.width) continue;

      const si = (y * src.width + x) * 4;
      const a = src.data[si + 3] / 255;
      if (a === 0) continue;

      const di = (dy * dst.width + dx) * 4;
      for (let c = 0; c < 3; c++) {
        dst.data[di + c] = Math.round(src.data[si + c] * a + dst.data[di + c] * (1 - a));
      }
      dst.data[di + 3] = 255;
    }
  }
}

/** 이미지를 캔버스 가운데(세로 비율 지정 가능)에 놓는다 */
function place(dst, src, targetW, verticalRatio = 0.5) {
  const scaled = resize(src, targetW, Math.round((src.height / src.width) * targetW));
  const ox = Math.round((dst.width - scaled.width) / 2);
  const oy = Math.round(dst.height * verticalRatio - scaled.height / 2);
  composite(dst, scaled, ox, oy);
}

/* ── 스플래시 ─────────────────────────────────────────────────
   Expo 는 resizeMode:'contain' 으로 화면에 맞춰 letterbox 한다.
   캔버스 배경색과 app.json 의 backgroundColor 를 같게 두면 이음매가 안 보인다.

   구성: 손 흔드는 달곰이 + 그 아래 「달곰이 / Dalgomi」 로고 배너.
   시각적 무게 중심이 화면 정가운데에 오도록 달곰이를 살짝 위(43%)에 둔다. */
const wave = read('dalgomi-wave.png');
const logo = read('dalgomi-logo.png');

const splash = canvas(1284, 2778, BG);
place(splash, wave, 660, 0.43);
place(splash, logo, 560, 0.585);
fs.writeFileSync(path.join(OUT, 'splash.png'), PNG.sync.write(splash));
console.log('✓ assets/splash.png          1284×2778  (달곰이 + 로고)');

/* ── iOS 아이콘 ───────────────────────────────────────────────
   투명도가 있으면 안 되고, 모서리는 iOS 가 알아서 둥글린다.
   홈 화면에서 60px 남짓으로 작아지므로 얼굴만 크게 넣는다. */
const face = read('dalgomi-face-happy.png');
const icon = canvas(1024, 1024, ICON_BG);
place(icon, face, 800, 0.52);
fs.writeFileSync(path.join(OUT, 'icon.png'), PNG.sync.write(icon));
console.log('✓ assets/icon.png            1024×1024');

/* ── Android 적응형 아이콘 ────────────────────────────────────
   런처가 원·사각·물방울 등 제멋대로 마스킹한다. 가장자리 17%씩은 잘려도
   괜찮아야 하므로, 내용은 가운데 66% 안전영역 안에만 그린다. */
const adaptive = canvas(1024, 1024, ICON_BG);
place(adaptive, face, 560, 0.5);
fs.writeFileSync(path.join(OUT, 'adaptive-icon.png'), PNG.sync.write(adaptive));
console.log('✓ assets/adaptive-icon.png   1024×1024 (안전영역 66% 준수)');

/* ── 파비콘 (웹) ─────────────────────────────────────────────── */
const favicon = canvas(96, 96, ICON_BG);
place(favicon, face, 84, 0.52);
fs.writeFileSync(path.join(OUT, 'favicon.png'), PNG.sync.write(favicon));
console.log('✓ assets/favicon.png         96×96');

console.log(`
원본 캐릭터가 ${face.width}px 라 아이콘(1024px)은 약 ${(1024 / face.width).toFixed(1)}배 확대됐습니다.
선명하게 하려면 시트를 3배 크기로 다시 내보낸 뒤
  npm run slice-mascot  →  npm run app-images
순서로 다시 돌리면 됩니다.`);
