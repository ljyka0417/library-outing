/**
 * 안드로이드 "내 주변" 지도 핀 그림을 만든다 → assets/map-pin/{주제}@3x.png, {주제}-on@3x.png
 *
 *   npm run map-pins
 *
 * 안드로이드 구글 지도는 핀 안에 그린 화면(View)을 사진처럼 찍어 쓰는데, 주제 아이콘 그림이
 * 찍히지 않고 빈 동그라미만 남았다(tracksViewChanges·fadeDuration·collapsable 다 해 봐도 그대로).
 * 그래서 동그라미 바탕 + 흰 테두리 + 주제 색 아이콘을 미리 한 장으로 합쳐 Marker image 로 준다.
 * 아이폰(애플 지도)은 원래대로 화면으로 그린다.
 *
 * 색은 src/theme/index.ts 의 LIGHT_CATEGORY 와 같게 둔다. 바꾸면 여기도 바꾸고 다시 돌린다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const CATEGORY = {
  landmark: { bg: '#E3F2EE', fg: '#3F8E7E' },
  kids: { bg: '#FFF1DC', fg: '#C98A3C' },
  language: { bg: '#E6F0FB', fg: '#3F7CB8' },
  music: { bg: '#FDE8EC', fg: '#C9536B' },
  art: { bg: '#FBE9E1', fg: '#C46B47' },
  nature: { bg: '#E4F3E6', fg: '#4C8F5A' },
  science: { bg: '#E9E7FB', fg: '#6B5FC4' },
  food: { bg: '#FDF0DC', fg: '#B98A33' },
  travel: { bg: '#E0F0F5', fg: '#3C8296' },
  humanities: { bg: '#EFEDE7', fg: '#6F6A5E' },
  law: { bg: '#E7EAF4', fg: '#5A61A8' },
  media: { bg: '#E9EDEF', fg: '#4F707E' },
  education: { bg: '#F1EBE2', fg: '#8B6F5C' },
};
const PRIMARY = '#4FA695';
const WHITE = '#FFFFFF';

// NearbyMap 의 styles.pin / pinOn 과 같은 크기(dp) × 3
const SIZES = {
  '': { box: 34 * 3, border: 2 * 3, icon: 20 * 3, ring: WHITE },
  '-on': { box: 46 * 3, border: 3 * 3, icon: 26 * 3, ring: PRIMARY },
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** 원본 아이콘(384px)의 알파만 써서 size 로 줄인다 — 칸마다 평균 */
function shrinkAlpha(src, size) {
  const out = new Float32Array(size * size);
  const k = src.width / size;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let n = 0;
      for (let sy = Math.floor(y * k); sy < Math.floor((y + 1) * k); sy++)
        for (let sx = Math.floor(x * k); sx < Math.floor((x + 1) * k); sx++) {
          sum += src.data[(sy * src.width + sx) * 4 + 3];
          n++;
        }
      out[y * size + x] = n ? sum / n / 255 : 0;
    }
  return out;
}

function makePin(iconPng, colors, s) {
  const { box, border, icon, ring } = s;
  const png = new PNG({ width: box, height: box });
  const c = box / 2;
  const R = box / 2 - 0.5;
  const alpha = shrinkAlpha(iconPng, icon);
  const off = Math.round((box - icon) / 2);
  const [br, bg, bb] = hex(colors.bg);
  const [rr, rg, rb] = hex(ring);
  const [fr, fg, fb] = hex(colors.fg);
  for (let y = 0; y < box; y++)
    for (let x = 0; x < box; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const outer = Math.min(1, Math.max(0, R - d + 0.5)); // 원 바깥 가장자리 부드럽게
      const inner = Math.min(1, Math.max(0, R - border - d + 0.5)); // 테두리 안쪽
      // 테두리 색 → 바탕색 → 아이콘 색 순서로 덮는다
      let r = rr + (br - rr) * inner;
      let g = rg + (bg - rg) * inner;
      let b = rb + (bb - rb) * inner;
      const ix = x - off;
      const iy = y - off;
      if (ix >= 0 && iy >= 0 && ix < icon && iy < icon) {
        const a = alpha[iy * icon + ix] * inner;
        r += (fr - r) * a;
        g += (fg - g) * a;
        b += (fb - b) * a;
      }
      const i = (y * box + x) * 4;
      png.data[i] = Math.round(r);
      png.data[i + 1] = Math.round(g);
      png.data[i + 2] = Math.round(b);
      png.data[i + 3] = Math.round(outer * 255);
    }
  return PNG.sync.write(png);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const outDir = path.join(root, 'assets', 'map-pin');
fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (const [id, colors] of Object.entries(CATEGORY)) {
  const iconPng = PNG.sync.read(fs.readFileSync(path.join(root, 'assets', 'category', `${id}.png`)));
  for (const [suffix, s] of Object.entries(SIZES)) {
    fs.writeFileSync(path.join(outDir, `${id}${suffix}@3x.png`), makePin(iconPng, colors, s));
    n++;
  }
}
/*
 * 내 위치(달곰이 얼굴) — 연한 민트 후광 64dp 안에 흰 동그라미 46dp(민트 테두리 3dp), 얼굴 34dp.
 * NearbyMap 의 styles.halo / me 와 같은 모양.
 */
function makeMe(face) {
  const box = 64 * 3;
  const inR = (46 * 3) / 2;
  const border = 3 * 3;
  const faceSize = 34 * 3;
  const png = new PNG({ width: box, height: box });
  const c = box / 2;
  const [hr, hg, hb] = hex(PRIMARY);
  const off = (box - faceSize) / 2;
  const k = face.width / faceSize;
  for (let y = 0; y < box; y++)
    for (let x = 0; x < box; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const halo = Math.min(1, Math.max(0, box / 2 - 0.5 - d + 0.5)) * 0.22;
      const disc = Math.min(1, Math.max(0, inR - d + 0.5));
      const inner = Math.min(1, Math.max(0, inR - border - d + 0.5));
      // 테두리(민트) → 안쪽(흰) → 얼굴
      let r = hr + (255 - hr) * inner;
      let g = hg + (255 - hg) * inner;
      let b = hb + (255 - hb) * inner;
      const fx = x - off;
      const fy = y - off;
      if (fx >= 0 && fy >= 0 && fx < faceSize && fy < faceSize && inner > 0) {
        // 칸마다 평균(알파 곱해서)
        let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
        for (let sy = Math.floor(fy * k); sy < Math.max(Math.floor(fy * k) + 1, Math.floor((fy + 1) * k)); sy++)
          for (let sx = Math.floor(fx * k); sx < Math.max(Math.floor(fx * k) + 1, Math.floor((fx + 1) * k)); sx++) {
            const i = (Math.min(sy, face.height - 1) * face.width + Math.min(sx, face.width - 1)) * 4;
            const a = face.data[i + 3] / 255;
            sr += face.data[i] * a; sg += face.data[i + 1] * a; sb += face.data[i + 2] * a; sa += a; n++;
          }
        const a = (sa / n) * inner;
        if (sa > 0) {
          r += (sr / sa - r) * a;
          g += (sg / sa - g) * a;
          b += (sb / sa - b) * a;
        }
      }
      // 동그라미 밖은 후광색
      const alpha = disc + halo * (1 - disc);
      const mix = disc / (alpha || 1);
      const i = (y * box + x) * 4;
      png.data[i] = Math.round(hr + (r - hr) * mix);
      png.data[i + 1] = Math.round(hg + (g - hg) * mix);
      png.data[i + 2] = Math.round(hb + (b - hb) * mix);
      png.data[i + 3] = Math.round(alpha * 255);
    }
  return PNG.sync.write(png);
}
const face = PNG.sync.read(fs.readFileSync(path.join(root, 'assets', 'mascot', 'poses', 'dalgomi-face-happy.png')));
fs.writeFileSync(path.join(outDir, 'me@3x.png'), makeMe(face));
n++;

console.log(`지도 핀 ${n}장 → assets/map-pin`);
