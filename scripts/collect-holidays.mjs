/**
 * 공휴일을 받아 둔다 — "지금 운영중" 이 공휴일 휴관을 알게 하려고.
 *
 *   npm run collect-holidays
 *
 * 한국천문연구원 특일 정보(공공데이터포털) getRestDeInfo, 올해·내년치.
 * 대체공휴일·임시공휴일·선거일도 API 가 알려 주는 대로 담긴다. 해가 바뀌기 전에 한 번 다시 돌린다.
 * 키는 .env 의 DATA_GO_KR_KEY (포털에서 이 API 를 따로 "활용신청" 해야 쓸 수 있다).
 *
 * 결과: src/data/holidays.generated.json  { dates: { "2026-10-03": "개천절", ... } }
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, sleep } from './lib/env.mjs';

const KEY = requireEnv('DATA_GO_KR_KEY', 'data.go.kr 인증키를 .env 에 넣어 주세요.');
const SERVICE_KEY = /%[0-9A-Fa-f]{2}/.test(KEY) ? KEY : encodeURIComponent(KEY);
const BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

const thisYear = new Date().getFullYear();
const years = [thisYear, thisYear + 1];
const dates = {};

for (const year of years) {
  for (let month = 1; month <= 12; month++) {
    const url = `${BASE}?solYear=${year}&solMonth=${String(month).padStart(2, '0')}&numOfRows=50&_type=json&serviceKey=${SERVICE_KEY}`;
    const res = await fetch(url);
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    const err = body?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg;
    if (!res.ok || err || !body?.response) {
      console.error(`\n${year}-${month} 실패: ${err ?? `HTTP ${res.status}`}`);
      if (/등록되지 않은|NOT_REGISTERED/.test(err ?? text)) {
        console.error('공공데이터포털에서 「한국천문연구원_특일 정보」 활용신청이 승인됐는지 확인하세요 (승인 후 반영까지 최대 1시간).');
      }
      process.exit(1);
    }
    let items = body.response.body?.items?.item ?? [];
    if (!Array.isArray(items)) items = [items];
    for (const it of items) {
      if (it.isHoliday !== 'Y') continue;
      const d = String(it.locdate);
      dates[`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`] = String(it.dateName).trim();
    }
    await sleep(120);
  }
}

const OUT = path.join(ROOT, 'src/data/holidays.generated.json');
fs.writeFileSync(OUT, JSON.stringify({
  _readme: '공휴일 (한국천문연구원 특일 정보). 직접 고치지 마세요 — npm run collect-holidays 가 덮어씁니다.',
  _generatedAt: new Date().toISOString(),
  years,
  dates,
}, null, 2) + '\n');
console.log(`공휴일 ${Object.keys(dates).length}일 (${years.join('·')}) → ${path.relative(ROOT, OUT)}`);
for (const [d, n] of Object.entries(dates)) console.log(`  ${d} ${n}`);
