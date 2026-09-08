/**
 * 앱 아이콘을 그린다.
 *
 *   npm run icon              검은 바탕에 흰 도형 (기본)
 *   npm run icon -- --invert  흰 바탕에 검은 도형
 *   npm run icon -- --mint    민트 바탕에 흰 도형
 *
 * 만드는 것
 *   assets/icon.png           1024×1024  iOS 홈 화면
 *   assets/adaptive-icon.png  1024×1024  Android. 원·사각 등으로 잘리므로
 *                                        도형을 가운데 66% 안전영역 안에 넣는다
 *   assets/favicon.png        64×64      웹 탭
 *
 * ⚠️ 왜 이미지를 자르지 않고 도형을 그리는가
 *   전에는 달곰이 시트에서 얼굴을 오려 3~5배 확대해 아이콘을 만들었다.
 *   1024px 로 키우면 가장자리가 뭉개져서 홈 화면에서 흐릿하게 보였다.
 *   도형은 수식이라 어떤 크기로 뽑아도 선명하다.
 *
 * 도형: 위치핀 안에 펼친 책.
 *   핀은 "여기"를, 책은 "도서관"을 말한다. 둘을 한 실루엣에 넣으면
 *   설명 없이도 지도 계열 앱이라는 게 읽힌다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { ROOT } from './lib/env.mjs';

const OUT = path.join(ROOT, 'assets');

/** 도형 좌표계. 실제 출력 크기와 무관하게 이 안에서 그린다. */
const BOX = 1024;
/** 픽셀 하나를 몇 등분해 볼 것인가. 계단을 없애기 위한 초과표본. */
const SS = 4;

const hex = (s) => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];

/**
 * 색 테마.
 *
 * bg 가 두 색이면 왼쪽 위에서 오른쪽 아래로 흐르는 그라데이션이 된다.
 * 홈 화면(60px)에서는 거의 안 보이지만 앱스토어 페이지에서는 크게 나오고,
 * 그때 단색과 확실히 달라 보인다.
 *
 * vignette 은 네 귀퉁이를 아주 살짝 눌러 주는 값이다. 0.06 정도면
 * "왜인지 모르게 도형이 떠 보이는" 효과만 남고 그림자로는 안 읽힌다.
 */
const THEMES = {
  ink: {
    name: '먹색 그라데이션',
    bg: [hex('#3A3A3C'), hex('#0B0B0C')],
    fg: [hex('#FFFFFF'), hex('#E6E9E8')],
    vignette: 0.07,
  },
  forest: {
    name: '딥 그린 그라데이션 (브랜드 색 계열)',
    bg: [hex('#28453D'), hex('#0A1512')],
    fg: [hex('#FFFFFF'), hex('#DFEFE9')],
    vignette: 0.07,
  },
  midnight: {
    name: '미드나잇 블루 그라데이션',
    bg: [hex('#2B4560'), hex('#0A1119')],
    fg: [hex('#FFFFFF'), hex('#DDE7F0')],
    vignette: 0.07,
  },
  mint: {
    name: '민트 그라데이션',
    bg: [hex('#63C3B0'), hex('#2E6D60')],
    fg: [hex('#FFFFFF'), hex('#EAF6F3')],
    vignette: 0.05,
  },
  flat: {
    name: '검은 바탕 · 흰 도형 (단색)',
    bg: [hex('#111111'), hex('#111111')],
    fg: [hex('#FFFFFF'), hex('#FFFFFF')],
    vignette: 0,
  },
  invert: {
    name: '흰 바탕 · 검은 도형 (단색)',
    bg: [hex('#FFFFFF'), hex('#FFFFFF')],
    fg: [hex('#111111'), hex('#111111')],
    vignette: 0,
  },
};

const argv = process.argv.slice(2);
const key = Object.keys(THEMES).find((k) => argv.includes(`--${k}`)) ?? 'ink';
const theme = THEMES[key];

/* ── 도형 정의 ────────────────────────────────────────────── */

/** 3차 베지에를 선분으로 잘게 나눈다 */
function bezier(p0, p1, p2, p3, steps = 48) {
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

/** 원호. 각도는 화면 좌표(아래가 +y) 기준 도(degree). */
function arc(cx, cy, r, fromDeg, toDeg, steps = 96) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((fromDeg + (toDeg - fromDeg) * (i / steps)) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/**
 * 위치핀.
 * 머리는 중심 (512,438) 반지름 226 의 원, 몸통은 아래 한 점 (512,858) 으로 모인다.
 */
function pinPolygon() {
  const tip = [512, 858];
  const left = [286, 438];
  const right = [738, 438];
  return [
    tip,
    ...bezier(tip, [512, 858], [286, 610], left),
    ...arc(512, 438, 226, 180, 360),
    ...bezier(right, [738, 610], [512, 858], tip),
  ];
}

/**
 * 펼친 책.
 *
 * 두 면을 파내고, 그 사이에 책등을 남긴다.
 * 책등을 안 넣으면 두 면이 붙어 그냥 검은 사각형으로 보인다. 위아래 가운데가
 * 처지는 곡선과 가운데 세로선, 이 둘이 있어야 "펼친 책"으로 읽힌다.
 */
function bookShapes() {
  const top = [512, 358];
  const bottom = [512, 520];
  const leftPage = [
    top,
    ...bezier(top, [452, 322], [404, 314], [360, 318]),
    [360, 486],
    ...bezier([360, 486], [404, 478], [452, 486], bottom),
  ];
  const rightPage = [
    top,
    ...bezier(top, [572, 322], [620, 314], [664, 318]),
    [664, 486],
    ...bezier([664, 486], [620, 478], [572, 486], bottom),
  ];
  return [
    { poly: leftPage, value: 0 },
    { poly: rightPage, value: 0 },
    // 책등은 파낸 자리 위에 다시 도형 색으로 얹는다
    { poly: roundedRect(502, 348, 20, 186, 10), value: 1 },
  ];
}

function roundedRect(x, y, w, h, r) {
  return [
    ...arc(x + r, y + r, r, 180, 270),
    ...arc(x + w - r, y + r, r, 270, 360),
    ...arc(x + w - r, y + h - r, r, 0, 90),
    ...arc(x + r, y + h - r, r, 90, 180),
  ];
}

/* ── 색 ───────────────────────────────────────────────────── */

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function writePixel(data, i, rgb, alpha) {
  data[i] = Math.max(0, Math.min(255, Math.round(rgb[0])));
  data[i + 1] = Math.max(0, Math.min(255, Math.round(rgb[1])));
  data[i + 2] = Math.max(0, Math.min(255, Math.round(rgb[2])));
  data[i + 3] = alpha;
}

/**
 * 네 귀퉁이를 아주 살짝 어둡게 한다.
 *
 * 가운데에서 멀어질수록 조금씩 눌러 주면 도형이 떠 보인다.
 * 세게 주면 그림자로 읽혀 촌스러워지므로 값을 낮게 잡았다.
 */
function shade(rgb, x, y, size) {
  if (!theme.vignette) return rgb;
  const dx = (x / (size - 1)) * 2 - 1;
  const dy = (y / (size - 1)) * 2 - 1;
  const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) / Math.SQRT2);
  const k = 1 - theme.vignette * d * d;
  return [rgb[0] * k, rgb[1] * k, rgb[2] * k];
}

/* ── 래스터라이즈 ─────────────────────────────────────────── */

/**
 * 다각형을 마스크에 채운다 (스캔라인, even-odd).
 *
 * 점 하나하나가 도형 안인지 따지면 수십억 번 계산해야 한다.
 * 가로줄 단위로 도형과 만나는 x 를 구해 그 사이를 통째로 칠하면 훨씬 빠르다.
 */
function fillPolygon(mask, size, poly, value, transform) {
  const pts = poly.map(transform);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(size - 1, Math.ceil(maxY));

  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5;
    const xs = [];
    for (let i = 0, n = pts.length; i < n; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % n];
      if (ay === by) continue;
      if (cy >= Math.min(ay, by) && cy < Math.max(ay, by)) {
        xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const sx = Math.max(0, Math.ceil(xs[i] - 0.5));
      const ex = Math.min(size - 1, Math.floor(xs[i + 1] - 0.5));
      for (let x = sx; x <= ex; x++) mask[y * size + x] = value;
    }
  }
}

/**
 * 아이콘 한 장을 만든다.
 *
 * scale 은 도형 크기(1 = 화면 가득). Android 는 가장자리가 잘려 나가므로
 * 0.8 정도로 줄여 가운데 안전영역 안에 들어가게 한다.
 * transparent 를 켜면 바탕을 비운다 (Android 는 배경색을 따로 준다).
 */
function render(size, { scale = 1, transparent = false, bgOnly = false } = {}) {
  const big = size * SS;
  const mask = new Uint8Array(big * big);

  // 도형의 실제 세로 범위는 212~858 이라 가운데가 512 가 아니다.
  // 그대로 줄이면 아래로 치우쳐 보이므로 중심을 맞춰 놓고 줄인다.
  const cx = 512;
  const cy = (212 + 858) / 2;
  const k = (big / BOX) * scale;
  const transform = ([x, y]) => [
    big / 2 + (x - cx) * k,
    big / 2 + (y - cy) * k,
  ];

  fillPolygon(mask, big, pinPolygon(), 1, transform);
  for (const { poly, value } of bookShapes()) fillPolygon(mask, big, poly, value, transform);

  const png = new PNG({ width: size, height: size });
  const area = SS * SS;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 픽셀 하나를 SS×SS 로 나눠 본 뒤 평균을 내면 가장자리가 부드러워진다
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) {
        const row = (y * SS + sy) * big + x * SS;
        for (let sx = 0; sx < SS; sx++) hit += mask[row + sx];
      }
      const a = hit / area;
      const i = (y * size + x) << 2;

      // 왼쪽 위 0 → 오른쪽 아래 1 로 흐르는 대각선 위치
      const t = (x + y) / (2 * (size - 1));
      const fg = mix(theme.fg[0], theme.fg[1], t);

      if (bgOnly) {
        writePixel(png.data, i, shade(mix(theme.bg[0], theme.bg[1], t), x, y, size), 255);
      } else if (transparent) {
        writePixel(png.data, i, fg, Math.round(a * 255));
      } else {
        const bg = shade(mix(theme.bg[0], theme.bg[1], t), x, y, size);
        writePixel(png.data, i, mix(bg, fg, a), 255);
      }
    }
  }
  return png;
}

function write(name, png) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log(`  ${name.padEnd(20)} ${png.width}×${png.height}`);
}

console.log(`앱 아이콘 생성 — ${theme.name}\n`);

write('icon.png', render(1024, { scale: 0.98 }));
// Android 는 마스크 바깥이 잘린다. 도형만 담고 바탕은 따로 깐다.
write('adaptive-icon.png', render(1024, { scale: 0.78, transparent: true }));
// 안드로이드 배경. 단색으로는 그라데이션을 줄 수 없어 이미지로 깐다.
write('adaptive-background.png', render(1024, { bgOnly: true }));
write('favicon.png', render(64, { scale: 0.92 }));

const mid = mix(theme.bg[0], theme.bg[1], 0.5)
  .map((n) => Math.round(n).toString(16).padStart(2, '0'))
  .join('');

console.log(`
app.json 의 android.adaptiveIcon
  backgroundImage 로 adaptive-background.png 를 쓰고 있습니다.
  그게 안 먹는 환경이면 backgroundColor 를 #${mid} 로 두세요 (그라데이션 중간색).
`);
