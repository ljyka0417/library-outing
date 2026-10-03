/**
 * 미세먼지 측정소 목록 — 중계 서버가 "이 자리에서 가장 가까운 측정소"를 고를 때 쓴다.
 *
 *   npm run collect-air-stations
 *
 * 에어코리아 실시간 측정값(시도별)에는 측정소 이름만 있고 위치가 없다. 그래서 측정소정보 API 로
 * 좌표를 한 번 받아 서버 코드에 담는다(측정소는 거의 바뀌지 않는다). 앱 사용 중에는 이 API 를 쓰지 않는다.
 * 키는 .env 의 DATA_GO_KR_KEY (공공데이터포털 「한국환경공단_에어코리아_측정소정보」 활용신청 필요).
 *
 * 결과: server/loan-proxy/src/air-stations.js  — [이름, 시도(실시간 자료의 sidoName), 위도, 경도]
 * 받은 뒤 cd server/loan-proxy && npx wrangler deploy
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv } from './lib/env.mjs';

const KEY = requireEnv('DATA_GO_KR_KEY', 'data.go.kr 인증키를 .env 에 넣어 주세요.');
const SERVICE_KEY = /%[0-9A-Fa-f]{2}/.test(KEY) ? KEY : encodeURIComponent(KEY);

/** 주소 첫 낱말 → 실시간 자료의 시도 이름 */
const SIDO = {
  서울: '서울', 서울특별시: '서울', 서울시: '서울', 부산: '부산', 부산광역시: '부산', 대구: '대구', 대구광역시: '대구',
  인천: '인천', 인천광역시: '인천', 광주: '전남광주', 광주광역시: '전남광주', 대전: '대전', 대전광역시: '대전',
  울산: '울산', 울산광역시: '울산', 세종: '세종', 세종특별자치시: '세종', 경기: '경기', 경기도: '경기',
  강원: '강원', 강원도: '강원', 강원특별자치도: '강원', 충북: '충북', 충청북도: '충북', 충남: '충남', 충청남도: '충남',
  전북: '전북', 전라북도: '전북', 전북특별자치도: '전북', 전남: '전남광주', 전라남도: '전남광주', 전남광주통합특별시: '전남광주',
  경북: '경북', 경상북도: '경북', 경남: '경남', 경상남도: '경남', 제주: '제주', 제주특별자치도: '제주',
};

const res = await fetch(`https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getMsrstnList?serviceKey=${SERVICE_KEY}&returnType=json&numOfRows=1000&pageNo=1`);
const text = await res.text();
let items;
try {
  items = JSON.parse(text).response.body.items;
} catch {
  console.error('측정소 목록을 받지 못했습니다:', text.slice(0, 200));
  process.exit(1);
}

const rows = [];
const unknownSido = new Set();
for (const s of items) {
  // 이 API 는 dmX 에 위도, dmY 에 경도를 준다
  const lat = Number(s.dmX), lng = Number(s.dmY);
  if (!(lat > 32 && lat < 39.5 && lng > 124 && lng < 132)) continue;
  // 미세먼지·초미세먼지를 재는 곳만
  if (!/PM10/.test(s.item ?? '') && !/PM2\.5/.test(s.item ?? '')) continue;
  const first = String(s.addr ?? '').split(/\s+/)[0];
  const sido = SIDO[first];
  if (!sido) unknownSido.add(first);
  rows.push([s.stationName, sido ?? '', Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]);
}

const OUT = path.join(ROOT, 'server/loan-proxy/src/air-stations.js');
fs.writeFileSync(OUT,
  `// 에어코리아 측정소 [이름, 시도, 위도, 경도] — npm run collect-air-stations 가 만든다. 직접 고치지 마세요.\n` +
  `// 받은 날: ${new Date().toISOString().slice(0, 10)}\n` +
  `export default ${JSON.stringify(rows)};\n`);
console.log(`측정소 ${rows.length}곳 → ${path.relative(ROOT, OUT)}`);
if (unknownSido.size) console.log(`시도를 모르는 주소 첫 낱말: ${[...unknownSido].join(', ')}`);
