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
<title>${esc(seed.name)} · 라키브</title>
<meta name="description" content="${esc(seed.name)} (${esc(region)}) — ${esc(seed.specialty)} 특화 도서관. 달곰이와 함께하는 전국 도서관 나들이.">
<meta property="og:title" content="${esc(seed.name)} · 라키브">
<meta property="og:description" content="${esc(seed.specialty)} 특화 도서관 · ${esc(region)}">
<meta property="og:type" content="website">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <img src="${ROOT_REL}/dalgomi.png" alt="">
    <b>라키브</b>
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

  <p class="foot"><a href="${ROOT_REL}/">라키브 홈으로</a></p>
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
<title>라키브 · 전국 특화 도서관</title>
<meta name="description" content="달곰이와 함께하는 전국 도서관 나들이. 전국 ${seeds.length}곳의 특화 도서관을 주제별로 만나보세요.">
<style>${CSS}</style>
</head>
<body>
<div class="wrap" style="max-width:720px">
  <div class="brand">
    <img src="./dalgomi.png" alt="">
    <b>라키브</b>
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

  <p class="foot">달곰이 · 라키브</p>
</div>
</body>
</html>`;
}

/* ── 개인정보 처리방침 · 문의 (스토어 등록에 필요) ──────────── */

/**
 * 앱스토어·구글 플레이 모두 개인정보 처리방침 주소와 문의(지원) 주소를 요구한다.
 * 적힌 내용은 코드에서 확인한 사실만 쓴다 (2026-10-06 기준):
 *   - 회원가입·광고·분석 도구 없음. 즐겨찾기·방문 기록·코스·언어·화면 모드는 기기 안(AsyncStorage)에만 저장
 *   - 내 위치는 기기 안에서 거리 계산·지도 표시에만 쓰고 서버로 보내지 않는다
 *     (서버로 가는 것: 도서관 좌표, 검색어, 책 ISBN — src/api/*)
 *   - 중계 서버(Cloudflare Worker)가 공공 API·카카오를 대신 불러 준다
 * 앱 기능이 바뀌면 여기도 고친다.
 */
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'ljyka0417@gmail.com';
const POLICY_DATE = '2026년 10월 6일';

const docPage = (title, body) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · 라키브</title>
<style>${CSS}
.doc h1{font-size:22px;margin-bottom:4px}
.doc h2{font-size:16px;margin:26px 0 8px}
.doc p,.doc li{font-size:14.5px;color:#4A443E}
.doc ul{padding-left:20px;margin:6px 0}
.doc li{margin:4px 0}
.doc .date{color:#A79E93;font-size:13px;margin-bottom:8px}
.doc a{color:#3F8E7E}
</style>
</head>
<body>
<div class="wrap" style="max-width:720px">
  <div class="brand"><img src="${'../dalgomi.png'}" alt=""><b>라키브</b></div>
  <div class="card doc">
${body}
  </div>
  <p class="foot">달곰이 · 라키브</p>
</div>
</body>
</html>`;

const privacyPage = () =>
  docPage(
    '개인정보 처리방침',
    `
    <h1>개인정보 처리방침</h1>
    <p class="date">시행일 ${POLICY_DATE}</p>
    <p>라키브(이하 “앱”)는 이용자의 개인정보를 소중히 여기며, 꼭 필요한 정보만 기기 안에서 사용합니다.</p>

    <h2>1. 수집하는 개인정보</h2>
    <p>앱은 <b>회원가입이 없으며</b>, 이름·전화번호·이메일 등 이용자를 알아볼 수 있는 개인정보를 수집하거나 서버에 저장하지 않습니다.</p>

    <h2>2. 위치 정보</h2>
    <ul>
      <li>이용자가 허용한 경우에만 현재 위치를 사용합니다. 허용하지 않아도 앱의 다른 기능은 그대로 쓸 수 있습니다.</li>
      <li>위치는 <b>기기 안에서</b> ‘내 주변’ 지도 표시와 도서관까지의 거리 계산, 코스의 가까운 도서관 정렬에만 쓰며, <b>앱 운영자의 서버나 제3자에게 보내지 않고 저장하지도 않습니다.</b></li>
      <li>앱이 열려 있고 해당 화면을 보는 동안에만 위치를 사용하며, 백그라운드에서는 사용하지 않습니다.</li>
    </ul>

    <h2>3. 기기 안에 저장되는 정보</h2>
    <p>즐겨찾기, 방문 기록, 최근 본 도서관, 저장한 코스, 언어·화면 모드, 달곰이 꾸미기 설정은 이용자의 기기 안에만 저장됩니다. 설정 → ‘기록 전체 삭제’ 또는 앱 삭제로 언제든 지울 수 있습니다.</p>

    <h2>4. 외부 서비스 이용</h2>
    <p>도서 대출 여부, 날씨, 대중교통 도착 정보 등을 보여 주기 위해 앱의 중계 서버(Cloudflare)를 거쳐 아래 공공·외부 서비스에 정보를 요청합니다. 이때 보내는 정보는 <b>도서관의 위치, 검색어, 책 번호(ISBN)</b>뿐이며 이용자의 위치나 개인정보는 포함되지 않습니다.</p>
    <ul>
      <li>도서관 정보나루(국립중앙도서관), 공공데이터포털(기상청·에어코리아·국토교통부 등), 서울 열린데이터광장, 한국문화정보원</li>
      <li>카카오(장소·책 정보 검색)</li>
      <li>지도 표시: iOS는 Apple 지도, Android는 Google 지도를 사용하며, 지도를 불러올 때 각 회사의 개인정보 처리방침이 적용됩니다.</li>
    </ul>
    <p>중계 서버는 서비스 안정성을 위해 요청 결과를 잠시(최대 며칠) 보관할 수 있으나, 이용자를 식별할 수 있는 정보는 저장하지 않습니다.</p>

    <h2>5. 광고 및 분석</h2>
    <p>앱에는 광고가 없으며, 이용 행태를 분석하거나 추적하는 도구를 사용하지 않습니다.</p>

    <h2>6. 아동의 개인정보</h2>
    <p>앱은 개인정보를 수집하지 않으므로 만 14세 미만 아동의 개인정보도 수집하지 않습니다.</p>

    <h2>7. 문의</h2>
    <p>개인정보와 관련한 문의는 아래로 연락해 주세요.<br>이메일: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>

    <h2>8. 변경</h2>
    <p>이 방침이 바뀌면 이 페이지에 시행일과 함께 알립니다.</p>`
  );

const supportPage = () =>
  docPage(
    '문의하기',
    `
    <h1>문의하기</h1>
    <p>라키브를 이용해 주셔서 감사합니다. 앱 사용 중 궁금한 점, 잘못된 도서관 정보, 오류 신고는 아래 이메일로 보내 주세요.</p>
    <h2>이메일</h2>
    <p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
    <h2>자주 묻는 질문</h2>
    <ul>
      <li><b>운영시간이 실제와 달라요.</b> 가이드북 『오늘 도서관 갈래?』 기준 정보입니다. 방문 전 도서관에 꼭 확인해 주세요. 틀린 곳을 알려 주시면 고치겠습니다.</li>
      <li><b>내 주변 지도에 내 위치가 안 나와요.</b> 휴대폰 설정에서 위치 서비스와 라키브의 위치 권한을 켜 주세요.</li>
      <li><b>회원가입이 필요한가요?</b> 아니요. 기록은 이 기기에만 저장됩니다.</li>
    </ul>
    <p style="margin-top:18px"><a href="../privacy/">개인정보 처리방침</a></p>`
  );

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

for (const [dir, html] of [
  ['privacy', privacyPage()],
  ['support', supportPage()],
]) {
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, dir, 'index.html'), html, 'utf8');
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
