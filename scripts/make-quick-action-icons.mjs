/**
 * 안드로이드 앱 아이콘 길게 누르기 메뉴(퀵 액션)의 아이콘 → assets/quick-actions/*.png
 *
 *   node scripts/make-quick-action-icons.mjs
 *
 * 아이폰은 SF Symbols(애플 기본 아이콘)를 그대로 쓰므로 그림이 필요 없다.
 * 안드로이드는 그림 파일이 있어야 해서, 탭바와 같은 선 아이콘을 민트로 그려 둔다.
 * 그림은 가운데 46% 안 — 안드로이드가 동그랗게 잘라도 잘리지 않는 자리.
 * 모양은 Lucide 아이콘(ISC 라이선스)을 따라 그렸다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { ROOT } from './lib/env.mjs';

const OUT = path.join(ROOT, 'assets/quick-actions');
const COLOR = '#3F8F7F';

const GLYPHS = {
  search: `<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`,
  chat: `<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>`,
  nearby: `<polygon points="3 11 22 2 13 21 11 13 3 11"/>`,
  course: `<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>`,
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, glyph] of Object.entries(GLYPHS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="-14 -14 52 52" fill="none" stroke="${COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 432 } }).render().asPng();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  console.log(`assets/quick-actions/${name}.png`);
}
