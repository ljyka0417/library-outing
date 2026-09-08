/**
 * 책 QR이 앱으로 열리게 하는 웹 랜딩을 생성한다.
 *
 *   npm run build-web
 *   → docs/ 폴더 생성 (GitHub Pages 가 그대로 서빙)
 *
 * ─────────────────────────────────────────────────────────────
 * 이게 왜 필요한가
 * ─────────────────────────────────────────────────────────────
 * 책에 인쇄하는 QR 은 앱 스킴(libraryapp://)이 아니라 **웹 주소**여야 한다.
 * 앱 스킴을 인쇄하면 앱이 없는 사람에게는 "페이지를 열 수 없음" 오류만 뜬다.
 * 종이책은 한 번 인쇄하면 못 고치므로 이건 되돌릴 수 없는 실수가 된다.
 *
 *   QR:  https://도메인/library/seoul-library
 *          ├─ 앱 있음  → iOS/Android 가 링크를 가로채 앱의 해당 화면으로
 *          └─ 앱 없음  → 이 웹페이지 → 스토어로 유도
 *
 * 앱이 링크를 가로채려면 도메인 루트에 검증 파일이 있어야 한다:
 *   /.well-known/apple-app-site-association   (iOS Universal Links)
 *   /.well-known/assetlinks.json              (Android App Links)
 * 둘 다 여기서 함께 생성한다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/env.mjs';

const OUT = path.join(ROOT, 'docs');

/* ── 배포 설정 ─────────────────────────────────────────────────
   도메인을 사기 전에는 GitHub Pages 주소로 테스트할 수 있다.
   도메인이 생기면 SITE 만 바꾸고 다시 돌리면 된다. */
const SITE = process.env.SITE_URL || 'https://ljyka0417.github.io/library-outing';
const BUNDLE_ID = 'com.libraryouting.app';
const APP_SCHEME = 'libraryapp';

/** 스토어 링크 — 앱 등록 후 실제 ID 로 교체 */
const STORE = {
  ios: 'https://apps.apple.com/kr/app/idAPPLE_APP_ID',
  android: `https://play.google.com/store/apps/details?id=${BUNDLE_ID}`,
};

/* ── 도서관 데이터 읽기 ────────────────────────────────────── */
const src = fs.readFileSync(path.join(ROOT, 'src/data/libraries.mock.ts'), 'utf8');
const seeds = [
  ...src.matchAll(
    /\{ id: '([^']+)', name: '([^']+)', sido: '([^']+)'(?:, sigungu: '([^']+)')?, specialty: '([^']+)'/g
  ),
].map((m) => ({ id: m[1], name: m[2], sido: m[3], sigungu: m[4], specialty: m[5] }));

const readEntries = (f) => {
  const p = path.join(ROOT, 'src/data', f);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8')).entries ?? {};
};
const geo = readEntries('libraries.geocoded.json');
const enr = readEntries('libraries.enriched.json');
const man = readEntries('libraries.manual.json');
const detail = (id) => ({ ...geo[id], ...enr[id], ...man[id] });

/* ── 공통 스타일 (앱의 달곰이 팔레트와 맞춘다) ─────────────── */
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#FBF8F3;color:#2E2A26;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:520px;margin:0 auto;padding:32px 20px 56px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:28px}
.brand img{width:40px;height:40px}
.brand b{font-size:15px}
.card{background:#fff;border:1px solid #EDE6DC;border-radius:18px;padding:24px;box-shadow:0 4px 16px rgba(139,111,92,.06)}
.tag{display:inline-block;background:#E3F2EE;color:#3F8E7E;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;margin-bottom:12px}
h1{font-size:25px;line-height:1.45;margin-bottom:6px}
.region{color:#7A7269;font-size:14px}
dl{margin-top:20px;border-top:1px solid #F3EDE4}
.row{display:flex;gap:12px;padding:13px 0;border-bottom:1px solid #F3EDE4;font-size:14px}
dt{color:#7A7269;width:64px;flex:none}
dd{flex:1}
.cta{display:block;background:#4FA695;color:#fff;text-align:center;font-weight:700;font-size:16px;padding:17px;border-radius:14px;margin-top:24px;text-decoration:none}
.stores{display:flex;gap:10px;margin-top:12px}
.stores a{flex:1;text-align:center;border:1px solid #EDE6DC;background:#fff;color:#2E2A26;padding:13px;border-radius:12px;font-size:13px;text-decoration:none}
.hint{color:#A79E93;font-size:12.5px;text-align:center;margin-top:18px;line-height:1.7}
.foot{text-align:center;color:#A79E93;font-size:12px;margin-top:36px}
.foot a{color:#7A7269}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}
.grid a{background:#fff;border:1px solid #EDE6DC;border-radius:12px;padding:14px;text-decoration:none;color:#2E2A26;font-size:14px;font-weight:600}
.grid small{display:block;color:#A79E93;font-weight:400;font-size:12px;margin-top:2px}
`;

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 페이지가 열리자마자 앱 실행을 시도한다 (앱 링크가 안 걸린 경우의 보조 수단) */
const OPEN_SCRIPT = (id) => `
<script>
(function(){
  var scheme = ${JSON.stringify(`${APP_SCHEME}://library/${id}`)};
  var btn = document.getElementById('open');
  function tryOpen(){ window.location.href = scheme; }
  btn.addEventListener('click', function(e){ e.preventDefault(); tryOpen(); });
  // 앱 링크로 이미 앱이 열렸다면 이 페이지는 백그라운드로 간다.
  // 자동 실행은 하지 않는다 — 앱이 없는 사람에게 오류 화면만 띄우게 되기 때문.
})();
</script>`;

/**
 * 자산 경로는 상대경로로 쓴다.
 * 절대 URL 로 박아 두면 배포 전 로컬 미리보기에서 이미지가 깨지고,
 * 나중에 도메인을 바꿀 때도 전부 다시 생성해야 한다.
 * 도서관 페이지는 /library/{id}/ 아래라 두 단계 위가 루트다.
 */
const ROOT_REL = '../..';

function libraryPage(seed) {
  const d = detail(seed.id);
  const region = [seed.sido, seed.sigungu].filter(Boolean).join(' ');
  const rows = [
    ['특화', seed.specialty],
    ['지역', region],
    ['위치', d.address],
    ['운영시간', d.hours?.label],
    ['휴관일', d.closedDays],
    ['전화', d.phone],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<div class="row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
    .join('\n      ');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(seed.name)} · 도서관 지도</title>
<meta name="description" content="${esc(seed.name)} (${esc(region)}) — ${esc(seed.specialty)} 특화 도서관. 달곰이와 함께하는 전국 도서관 나들이.">
<meta property="og:title" content="${esc(seed.name)} · 도서관 지도">
<meta property="og:description" content="${esc(seed.specialty)} 특화 도서관 · ${esc(region)}">
<meta property="og:type" content="website">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <img src="${ROOT_REL}/dalgomi.png" alt="">
    <b>도서관 지도</b>
  </div>

  <div class="card">
    <span class="tag">${esc(seed.specialty)}</span>
    <h1>${esc(seed.name)}</h1>
    <div class="region">${esc(region)}</div>

    <dl>
      ${rows}
    </dl>

    <a class="cta" id="open" href="#">앱에서 열기</a>

    <div class="stores">
      <a href="${STORE.ios}">App Store</a>
      <a href="${STORE.android}">Google Play</a>
    </div>

    <p class="hint">앱이 설치되어 있으면 바로 열립니다.<br>없다면 위에서 설치해 주세요.</p>
  </div>

  <p class="foot"><a href="${ROOT_REL}/">도서관 지도 홈으로</a></p>
</div>
${OPEN_SCRIPT(seed.id)}
</body>
</html>`;
}

function indexPage() {
  const byRegion = {};
  for (const s of seeds) (byRegion[s.sido] ??= []).push(s);

  const sections = Object.entries(byRegion)
    .map(
      ([sido, list]) => `
  <h2 style="font-size:15px;margin:28px 0 4px">${sido} <span style="color:#A79E93;font-weight:400;font-size:13px">${list.length}곳</span></h2>
  <div class="grid">
    ${list
      .map(
        (s) =>
          `<a href="./library/${s.id}/">${esc(s.name)}<small>${esc(s.specialty)}</small></a>`
      )
      .join('\n    ')}
  </div>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>도서관 지도 · 전국 특화 도서관 132곳</title>
<meta name="description" content="달곰이와 함께하는 전국 도서관 나들이. 전국 ${seeds.length}곳의 특화 도서관을 주제별로 만나보세요.">
<style>${CSS}</style>
</head>
<body>
<div class="wrap" style="max-width:720px">
  <div class="brand">
    <img src="./dalgomi.png" alt="">
    <b>도서관 지도</b>
  </div>

  <div class="card">
    <h1>달곰이와 함께<br>도서관 나들이</h1>
    <p style="color:#7A7269;margin-top:10px;font-size:14.5px">
      가이드북에서 마음에 드는 도서관을 찾았다면 옆에 있는 QR 코드를 찍어 보세요.
      운영시간과 특화 서비스는 물론, 주변 맛집·카페까지 한 번에 볼 수 있습니다.
    </p>
    <div class="stores" style="margin-top:22px">
      <a href="${STORE.ios}">App Store</a>
      <a href="${STORE.android}">Google Play</a>
    </div>
  </div>

  <h2 style="font-size:17px;margin:36px 0 2px">수록 도서관 ${seeds.length}곳</h2>
${sections}

  <p class="foot">달곰이 · 도서관 지도</p>
</div>
</body>
</html>`;
}

/* ── 앱 링크 검증 파일 ─────────────────────────────────────── */

/**
 * iOS Universal Links.
 * appID 는 "<Apple Team ID>.<번들 ID>" 형식이다.
 * Team ID 는 Apple Developer 등록 후 developer.apple.com > Membership 에서 확인한다.
 */
const AASA = {
  applinks: {
    apps: [],
    details: [
      {
        appID: `APPLE_TEAM_ID.${BUNDLE_ID}`,
        paths: ['/library/*'],
      },
    ],
  },
};

/**
 * Android App Links.
 * sha256_cert_fingerprints 는 앱에 서명한 키스토어의 지문이다.
 * EAS 가 관리하므로 아래로 확인한다:
 *   npx eas credentials --platform android
 */
const ASSETLINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: BUNDLE_ID,
      sha256_cert_fingerprints: ['ANDROID_SHA256_FINGERPRINT'],
    },
  },
];

/* ── 실행 ──────────────────────────────────────────────────── */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, '.well-known'), { recursive: true });

fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(), 'utf8');

for (const seed of seeds) {
  const dir = path.join(OUT, 'library', seed.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), libraryPage(seed), 'utf8');
}

// GitHub Pages 가 Jekyll 처리로 .well-known 폴더를 무시하지 않게 한다
fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');

fs.writeFileSync(
  path.join(OUT, '.well-known', 'apple-app-site-association'),
  JSON.stringify(AASA, null, 2),
  'utf8'
);
fs.writeFileSync(
  path.join(OUT, '.well-known', 'assetlinks.json'),
  JSON.stringify(ASSETLINKS, null, 2),
  'utf8'
);

// 랜딩에서 쓸 달곰이 아이콘
const icon = path.join(ROOT, 'assets/mascot/poses/dalgomi-face-happy.png');
if (fs.existsSync(icon)) fs.copyFileSync(icon, path.join(OUT, 'dalgomi.png'));

console.log(`✓ docs/ 생성 완료`);
console.log(`  index.html + 도서관 ${seeds.length}곳`);
console.log(`  .well-known/apple-app-site-association  (Team ID 채워야 함)`);
console.log(`  .well-known/assetlinks.json             (SHA256 지문 채워야 함)`);
console.log(`\n배포 주소: ${SITE}`);
console.log(`QR 인쇄값 예시: ${SITE}/library/${seeds[0]?.id}`);
