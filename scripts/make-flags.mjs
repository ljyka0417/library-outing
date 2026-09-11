/**
 * 언어 단추에 쓰는 국기 네 장을 그린다.
 *
 *   npm run flags
 *
 * 만드는 것
 *   assets/flags/kr.png  ko  대한민국
 *   assets/flags/us.png  en  미국
 *   assets/flags/jp.png  ja  일본
 *   assets/flags/cn.png  zh  중국
 *
 * ⚠️ 왜 이모지도 아니고 도형도 아니고 그림인가
 *   이모지 국기(🇰🇷)는 아이폰에서만 제대로 나온다. 윈도우 브라우저와 일부
 *   안드로이드는 국기 글꼴이 없어 "KR", "US" 같은 알파벳 두 글자로 나온다.
 *   그렇다고 View 로 그리자니 태극 문양이 곡선이라 네모로는 흉내가 안 된다.
 *   그래서 규격대로 그려서 그림으로 굽는다. 어디서 보든 같은 모양이 나온다.
 *
 * 비율은 넷 다 3:2 로 맞춘다. 성조기 원 비율은 19:10 이라 세로로 5% 늘어나는데,
 * 21픽셀짜리 단추에서는 알아볼 수 없고 네 개를 나란히 놓았을 때 줄이 맞는 쪽이
 * 훨씬 낫다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { ROOT } from './lib/env.mjs';

const OUT = path.join(ROOT, 'assets', 'flags');

/** 내보낼 크기. 21×14 로 쓰니 6배면 어느 화면에서도 선명하다. */
const W = 132;
const H = 88;
/** 픽셀 하나를 몇 등분해 볼 것인가 (계단 없애기) */
const SS = 4;

const hex = (s) => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];

const RAD = Math.PI / 180;

/* ── 도형 만들기 ──────────────────────────────────────────── */

/** 원호. 각도는 화면 좌표(아래가 +y) 기준 도(degree). */
function arc(cx, cy, r, fromDeg, toDeg, steps = 180) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (fromDeg + (toDeg - fromDeg) * (i / steps)) * RAD;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

const circle = (cx, cy, r) => arc(cx, cy, r, 0, 360);

/**
 * 오각별. rot 은 뾰족한 끝이 향하는 방향(도). 기본은 위쪽.
 * 안쪽 반지름은 바깥의 sin18°/sin126° — 정오각별의 비율이다.
 */
function star(cx, cy, R, rot = -90) {
  const r = R * (Math.sin(18 * RAD) / Math.sin(126 * RAD));
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (rot + i * 36) * RAD;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  return pts;
}

/** 가운데 (cx,cy), 길이 len, 두께 th, 긴 방향이 angle 인 막대 */
function bar(cx, cy, len, th, angleDeg) {
  const a = angleDeg * RAD;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  // 긴 방향에 직각인 방향
  const vx = -uy;
  const vy = ux;
  const hl = len / 2;
  const ht = th / 2;
  return [
    [cx - ux * hl - vx * ht, cy - uy * hl - vy * ht],
    [cx + ux * hl - vx * ht, cy + uy * hl - vy * ht],
    [cx + ux * hl + vx * ht, cy + uy * hl + vy * ht],
    [cx - ux * hl + vx * ht, cy - uy * hl + vy * ht],
  ];
}

/* ── 칠하기 ──────────────────────────────────────────────── */

/** 짝수-홀수 규칙으로 다각형 안을 칠한다 (가로줄 훑기). */
function fill(buf, w, h, pts, rgb) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(h - 1, Math.ceil(maxY));

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
      const ex = Math.min(w - 1, Math.floor(xs[i + 1] - 0.5));
      for (let x = sx; x <= ex; x++) {
        const p = (y * w + x) * 3;
        buf[p] = rgb[0];
        buf[p + 1] = rgb[1];
        buf[p + 2] = rgb[2];
      }
    }
  }
}

/** 크게 그린 뒤 줄여서 계단을 없앤다. */
function bake(draw) {
  const bw = W * SS;
  const bh = H * SS;
  const buf = new Uint8Array(bw * bh * 3);

  draw({
    w: bw,
    h: bh,
    // 좌표는 항상 132×88 기준으로 쓰고, 여기서 확대한다
    s: (v) => v * SS,
    paint: (pts, color) => fill(buf, bw, bh, pts.map(([x, y]) => [x * SS, y * SS]), color),
    ground: (color) => {
      for (let i = 0; i < bw * bh; i++) {
        buf[i * 3] = color[0];
        buf[i * 3 + 1] = color[1];
        buf[i * 3 + 2] = color[2];
      }
    },
  });

  const png = new PNG({ width: W, height: H });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const p = ((y * SS + dy) * bw + (x * SS + dx)) * 3;
          r += buf[p];
          g += buf[p + 1];
          b += buf[p + 2];
        }
      }
      const n = SS * SS;
      const i = (y * W + x) * 4;
      png.data[i] = Math.round(r / n);
      png.data[i + 1] = Math.round(g / n);
      png.data[i + 2] = Math.round(b / n);
      png.data[i + 3] = 255;
    }
  }
  return png;
}

/* ── 국기 넷 ─────────────────────────────────────────────── */

/**
 * 태극기.
 *
 * 규격(대한민국 국기법)
 *   가로:세로 = 3:2, 태극 지름 = 세로의 1/2
 *   괘의 길이 = 태극 지름의 1/2, 세 막대를 합친 폭 = 태극 지름의 1/3
 *   태극과 괘는 모두 깃면 대각선 위에 놓인다 (3:2 이므로 33.69°)
 */
function korea() {
  const white = hex('#FFFFFF');
  const red = hex('#CD2E3A');
  const blue = hex('#0047A0');
  const black = hex('#000000');

  const cx = W / 2;
  const cy = H / 2;
  const R = H / 4;
  const PHI = 33.69;
  const dx = Math.cos(PHI * RAD);
  const dy = Math.sin(PHI * RAD);

  return bake(({ ground, paint }) => {
    ground(white);

    // 태극 — 원 전체를 빨강으로 깔고, 파랑 쪽만 다시 칠한다
    paint(circle(cx, cy, R), red);

    /*
     * 파랑 영역의 테두리는 세 도막이다.
     *   ① 원의 아래쪽 큰 호 (B → A)
     *   ② A → 가운데 : 작은 반원. 아래로 불룩 (왼쪽에서 빨강이 내려온다)
     *   ③ 가운데 → B : 작은 반원. 위로 불룩 (오른쪽에서 파랑이 올라간다)
     * 이 두 반원이 S 자를 만든다.
     */
    const bigArc = arc(cx, cy, R, PHI, PHI + 180);
    const m1x = cx - (R / 2) * dx;
    const m1y = cy - (R / 2) * dy;
    const m2x = cx + (R / 2) * dx;
    const m2y = cy + (R / 2) * dy;
    const s1 = arc(m1x, m1y, R / 2, PHI + 180, PHI);
    const s2 = arc(m2x, m2y, R / 2, PHI + 180, PHI + 360);
    paint([...bigArc, ...s1, ...s2], blue);

    // 4괘
    const L = R; // 괘의 길이 = 태극 지름의 1/2
    const T = H / 24; // 막대 하나의 두께
    const G = H / 48; // 막대 사이
    const DIST = H * 0.465; // 깃면 중심에서 괘 중심까지
    const SPLIT = L / 5; // 끊어진 막대의 가운데 틈

    /** broken[i] 가 true 면 그 막대는 둘로 끊어진다 */
    const draw = (ux, uy, broken) => {
      const gx = cx + ux * DIST;
      const gy = cy + uy * DIST;
      // 막대는 중심에서 뻗은 방향과 직각이다
      const angle = Math.atan2(uy, ux) / RAD + 90;
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * (T + G);
        const bx = gx + ux * off;
        const by = gy + uy * off;
        if (!broken[i]) {
          paint(bar(bx, by, L, T, angle), black);
        } else {
          const seg = (L - SPLIT) / 2;
          const a = angle * RAD;
          const hx = Math.cos(a) * (SPLIT + seg) / 2;
          const hy = Math.sin(a) * (SPLIT + seg) / 2;
          paint(bar(bx - hx, by - hy, seg, T, angle), black);
          paint(bar(bx + hx, by + hy, seg, T, angle), black);
        }
      }
    };

    const SSS = [false, false, false]; // 건 ☰
    const BBB = [true, true, true]; // 곤 ☷
    const BSB = [true, false, true]; // 감 ☵
    const SBS = [false, true, false]; // 리 ☲

    draw(-dx, -dy, SSS); // 좌상 건
    draw(dx, dy, BBB); // 우하 곤
    draw(dx, -dy, BSB); // 우상 감
    draw(-dx, dy, SBS); // 좌하 리
  });
}

/** 일장기. 흰 바탕 가운데 붉은 원, 지름은 세로의 3/5. */
function japan() {
  return bake(({ ground, paint }) => {
    ground(hex('#FFFFFF'));
    paint(circle(W / 2, H / 2, (H * 3) / 10), hex('#BC002D'));
  });
}

/**
 * 오성홍기.
 *
 * 규격 — 깃면을 가로 30 × 세로 20 칸으로 나눈다.
 *   큰 별: 중심 (5,5), 외접원 반지름 3
 *   작은 별 넷: 반지름 1, 중심 (10,2) (12,4) (12,7) (10,9)
 *   작은 별은 저마다 큰 별 중심 쪽으로 뿔 하나를 향한다
 */
function china() {
  const u = W / 30; // 칸 하나
  const big = [5 * u, 5 * u];
  const smalls = [
    [10, 2],
    [12, 4],
    [12, 7],
    [10, 9],
  ];

  return bake(({ ground, paint }) => {
    ground(hex('#EE1C25'));
    const yellow = hex('#FFDE00');
    paint(star(big[0], big[1], 3 * u), yellow);
    for (const [gx, gy] of smalls) {
      const x = gx * u;
      const y = gy * u;
      // 큰 별 쪽을 향하도록 돌린다
      const rot = Math.atan2(big[1] - y, big[0] - x) / RAD;
      paint(star(x, y, u, rot), yellow);
    }
  });
}

/**
 * 성조기.
 *
 * 줄 13개(빨강 7·흰 6, 맨 위가 빨강), 왼쪽 위 파란 칸은 세로 7/13 ·
 * 가로 2/5. 별 50개는 9줄로 6·5개가 번갈아 놓인다.
 */
function usa() {
  const stripe = H / 13;
  const cw = (W * 2) / 5;
  const ch = stripe * 7;

  return bake(({ ground, paint }) => {
    ground(hex('#FFFFFF'));
    const red = hex('#B22234');

    for (let i = 0; i < 13; i += 2) {
      paint(
        [
          [0, i * stripe],
          [W, i * stripe],
          [W, (i + 1) * stripe],
          [0, (i + 1) * stripe],
        ],
        red
      );
    }

    paint(
      [
        [0, 0],
        [cw, 0],
        [cw, ch],
        [0, ch],
      ],
      hex('#3C3B6E')
    );

    // 11칸 × 9줄 격자에 지그재그로 놓는다
    const sx = cw / 12;
    const sy = ch / 10;
    const R = H * 0.0308;
    const white = hex('#FFFFFF');
    for (let row = 1; row <= 9; row++) {
      for (let col = 1; col <= 11; col++) {
        if ((row + col) % 2 === 0) continue; // 줄마다 한 칸씩 건너뛴다
        paint(star(col * sx, row * sy, R), white);
      }
    }
  });
}

/* ── 내보내기 ────────────────────────────────────────────── */

fs.mkdirSync(OUT, { recursive: true });

const FLAGS = [
  ['kr.png', korea],
  ['us.png', usa],
  ['jp.png', japan],
  ['cn.png', china],
];

console.log('국기 생성\n');
for (const [name, make] of FLAGS) {
  const png = make();
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  console.log(`  assets/flags/${name.padEnd(8)} ${png.width}×${png.height}`);
}
console.log('\n끝. src/components/Flag.tsx 가 이 그림을 쓴다.');
