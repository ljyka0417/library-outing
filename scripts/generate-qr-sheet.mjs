/**
 * QR 테스트 시트 생성기
 *
 *   node scripts/generate-qr-sheet.mjs
 *   → qr-sheet.html 생성
 *
 * 도서관마다 3종류의 QR을 뽑는다. 각각 언제 쓰는지가 다르니 주의:
 *
 *  1) 인쇄용 (https://library-outing.kr/library/{id})
 *     → 실제 가이드북에 인쇄할 값. App Link 로 앱이 가로채고,
 *       앱이 없으면 웹 랜딩 → 스토어로 흐른다. **이것만 책에 인쇄한다.**
 *
 *  2) Expo Go 테스트용 (exp://{LAN_IP}:8081/--/library/{id})
 *     → Expo Go 는 커스텀 스킴(libraryapp://)을 받지 못한다.
 *       개발 중 실기기 테스트는 반드시 이 형식을 써야 한다.
 *
 *  3) 개발빌드/스토어 빌드용 (libraryapp://library/{id})
 *     → `npx expo run:android` 등으로 만든 네이티브 빌드에서만 동작.
 *       종이에 인쇄하면 안 된다 (미설치자에게 오류만 뜬다).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_BASE = 'https://library-outing.kr';
const APP_SCHEME = 'libraryapp';
const METRO_PORT = 8081;

/** 사설 IPv4 중 첫 번째를 고른다 (Expo 가 표시하는 주소와 같은 기준) */
function detectLanIp() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return '127.0.0.1';
}

/** mock 데이터 파일에서 id / name / 지역 / 특화 태그를 뽑아낸다. */
function readLibraries() {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/libraries.mock.ts'), 'utf8');
  const re =
    /\{ id: '([^']+)', name: '([^']+)', sido: '([^']+)'(?:, sigungu: '[^']+')?, specialty: '([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({ id: m[1], name: m[2], sido: m[3], specialty: m[4] });
  }
  return out;
}

const LAN_IP = detectLanIp();

const MODES = [
  {
    key: 'print',
    label: '인쇄용',
    hint: '실제 가이드북에 인쇄할 QR입니다. 앱이 있으면 앱으로, 없으면 스토어로 연결됩니다.',
    build: (id) => `${WEB_BASE}/library/${id}`,
  },
  {
    key: 'expo',
    label: 'Expo Go 테스트용',
    hint: `개발 중 실기기 테스트용. 휴대폰이 PC와 같은 Wi-Fi에 있어야 하고, 개발 서버(${LAN_IP}:${METRO_PORT})가 켜져 있어야 합니다.`,
    build: (id) => `exp://${LAN_IP}:${METRO_PORT}/--/library/${id}`,
  },
  {
    key: 'scheme',
    label: '네이티브 빌드용',
    hint: 'expo run:android / run:ios 로 만든 개발빌드, 또는 스토어 배포본에서만 동작합니다. 종이에 인쇄하지 마세요.',
    build: (id) => `${APP_SCHEME}://library/${id}`,
  },
];

const libraries = readLibraries();
if (libraries.length === 0) {
  console.error('도서관 데이터를 찾지 못했습니다. src/data/libraries.mock.ts 를 확인하세요.');
  process.exit(1);
}

const cards = [];
for (const lib of libraries) {
  const perMode = {};
  for (const mode of MODES) {
    const url = mode.build(lib.id);
    perMode[mode.key] = {
      url,
      dataUrl: await QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: 'M' }),
    };
  }
  cards.push({ ...lib, perMode });
}

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>전국 도서관 나들이 · QR 시트</title>
<style>
  :root {
    --bg: #FBF8F3; --surface: #fff; --border: #EDE6DC;
    --text: #2E2A26; --sub: #7A7269; --primary: #4FA695; --brown: #8B6F5C;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px; background: var(--bg); color: var(--text);
    font-family: "Pretendard", -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;
  }
  header { max-width: 1100px; margin: 0 auto 24px; }
  h1 { font-size: 24px; margin: 0 0 6px; }
  .sub { color: var(--sub); font-size: 14px; margin: 0; }
  .tabs { display: flex; gap: 8px; margin: 20px 0 10px; flex-wrap: wrap; }
  .tab {
    padding: 9px 16px; border-radius: 999px; border: 1px solid var(--border);
    background: var(--surface); color: var(--sub); font-size: 14px; cursor: pointer;
  }
  .tab[aria-selected="true"] { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 700; }
  .hint {
    background: #F0E7DE; color: var(--brown); border-radius: 10px;
    padding: 12px 16px; font-size: 13px; line-height: 1.6; max-width: 1100px; margin: 0 auto 24px;
  }
  .region { max-width: 1100px; margin: 0 auto 36px; }
  .region h2 {
    font-size: 17px; margin: 0 0 14px; padding-bottom: 8px;
    border-bottom: 2px solid var(--border);
  }
  .region h2 span { font-size: 13px; font-weight: 400; color: var(--sub); margin-left: 6px; }
  .grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px;
  }
  .specialty { font-size: 11px; color: var(--primary); margin-bottom: 6px; }
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
    padding: 16px; text-align: center;
  }
  .card img { width: 100%; height: auto; display: block; border-radius: 8px; }
  .name { font-size: 14px; font-weight: 700; margin: 12px 0 4px; }
  .url { font-size: 10px; color: var(--sub); word-break: break-all; line-height: 1.5; }
  @media print {
    body { background: #fff; padding: 0; }
    .tabs, .hint { display: none; }
    .card { break-inside: avoid; border-color: #ddd; }
  }
</style>
</head>
<body>
<header>
  <h1>전국 도서관 나들이 · QR 시트</h1>
  <p class="sub">도서관 ${cards.length}곳 · 생성일 ${new Date().toISOString().slice(0, 10)}</p>
  <div class="tabs" role="tablist">
    ${MODES.map(
      (m, i) =>
        `<button class="tab" role="tab" data-mode="${m.key}" aria-selected="${i === 0}">${m.label}</button>`
    ).join('')}
  </div>
</header>

${MODES.map(
  (m, i) => `<p class="hint" data-hint="${m.key}"${i === 0 ? '' : ' hidden'}>${m.hint}</p>`
).join('')}

${[...new Set(cards.map((c) => c.sido))]
  .map(
    (sido) => `<section class="region">
  <h2>${sido} <span>${cards.filter((c) => c.sido === sido).length}곳</span></h2>
  <div class="grid">
    ${cards
      .filter((c) => c.sido === sido)
      .map(
        (c) => `<div class="card">
      ${MODES.map(
        (m, i) =>
          `<img data-qr="${m.key}"${i === 0 ? '' : ' hidden'} src="${c.perMode[m.key].dataUrl}" alt="${c.name} QR">`
      ).join('')}
      <div class="name">${c.name}</div>
      <div class="specialty">${c.specialty}</div>
      ${MODES.map(
        (m, i) =>
          `<div class="url" data-url="${m.key}"${i === 0 ? '' : ' hidden'}>${c.perMode[m.key].url}</div>`
      ).join('')}
    </div>`
      )
      .join('\n    ')}
  </div>
</section>`
  )
  .join('\n')}

<script>
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      document.querySelectorAll('[data-qr]').forEach((el) => { el.hidden = el.dataset.qr !== mode; });
      document.querySelectorAll('[data-url]').forEach((el) => { el.hidden = el.dataset.url !== mode; });
      document.querySelectorAll('[data-hint]').forEach((el) => { el.hidden = el.dataset.hint !== mode; });
    });
  });
</script>
</body>
</html>`;

const outPath = path.join(ROOT, 'qr-sheet.html');
fs.writeFileSync(outPath, html, 'utf8');

console.log(`✓ ${cards.length}개 도서관 × ${MODES.length}종 QR 생성`);
console.log(`  → ${outPath}`);
console.log(`  LAN IP: ${LAN_IP} (Expo Go 테스트용 QR에 사용됨)`);
