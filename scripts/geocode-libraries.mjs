/**
 * 카카오 로컬 API 로 도서관 132곳의 좌표·주소·전화번호를 채운다.
 *
 *   npm run geocode
 *
 * 왜 필요한가
 *   정보나루 인증키 승인을 기다리는 동안에도 이건 먼저 할 수 있고,
 *   정보나루에 없는 작은도서관·사립도서관도 카카오에는 대체로 등록돼 있다.
 *   그리고 "주변 맛집·카페" 수집은 좌표가 있어야 시작할 수 있으므로 선행 작업이다.
 *
 * 신뢰도에 대하여
 *   키워드 검색은 엉뚱한 곳을 물어올 수 있다 ("남구도서관" 같은 흔한 이름).
 *   그래서 후보를 점수로 매기고, 확신이 없으면 채우지 않고 넘긴다.
 *   틀린 주소를 넣느니 비워 두는 편이 낫다.
 *   결과는 confidence 와 함께 기록하니 나중에 확인할 수 있다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, requireEnv, readSeeds, sleep, progress } from './lib/env.mjs';

const KEY = requireEnv(
  'KAKAO_REST_KEY',
  `1) https://developers.kakao.com > 내 애플리케이션 > 앱 추가
2) 만들어진 앱 > [앱 키] > REST API 키 복사
3) .env 에  KAKAO_REST_KEY=복사한키  한 줄 추가`
);

const seeds = readSeeds();
console.log(`도서관 ${seeds.length}곳 좌표·주소 조회\n`);

/**
 * 시도 약칭 → 카카오 주소가 실제로 쓰는 표기들.
 *
 * ⚠️ 카카오는 최신 행정구역명을 쓴다. 광주는 '전남광주통합특별시' 로 나오고,
 *    인천은 '검단구'·'영종구'·'서해구' 같은 신설 구가 보인다.
 *    옛 기준으로만 비교하면 멀쩡한 도서관이 전부 걸러지므로 둘 다 넣는다.
 */
const SIDO_PREFIXES = {
  서울: ['서울'],
  경기: ['경기'],
  인천: ['인천'],
  강원: ['강원'],
  충청: ['충북', '충청북도', '충남', '충청남도'],
  대전: ['대전'],
  세종: ['세종'],
  전라: ['전북', '전라북도', '전남', '전라남도', '전남광주통합특별시'],
  광주: ['광주', '전남광주통합특별시'],
  경상: ['경북', '경상북도', '경남', '경상남도'],
  대구: ['대구'],
  울산: ['울산'],
  부산: ['부산'],
  제주: ['제주'],
};

/**
 * 도서관일 리 없는 카테고리는 후보에서 아예 뺀다.
 * 이걸 안 하면 "미추홀도서관" 검색에 'GS25 미추홀도서관점'(편의점) 이,
 * "과천정보과학도서관" 에 '…주차장' 이 1위로 올라온다.
 */
const REJECT_CATEGORY_CODES = new Set([
  'CS2', // 편의점
  'PK6', // 주차장
  'FD6', // 음식점
  'CE7', // 카페
  'MT1', // 대형마트
  'OL7', // 주유소
  'BK9', // 은행
  'HP8', // 병원
  'PM9', // 약국
  'AD5', // 숙박
  'SW8', // 지하철역
  'AG2', // 중개업소
  'AC5', // 학원
]);

/** 이름에 이런 말이 붙어 있으면 본관이 아니라 부속 시설이다 */
const REJECT_NAME_WORDS = ['주차장', '편의점', '정류장', '버스', '출입구', '주차'];

const norm = (s = '') => s.replace(/\(.*?\)/g, '').replace(/[\s·\-_]/g, '').toLowerCase();

/** 행정 수식어를 걷어낸다. "고양시립 화정도서관" 과 "고양화정도서관" 을 같게 보기 위함. */
const ADMIN_WORDS = /(특별자치도|특별자치시|광역시|특별시|통합특별시|교육청|시립|도립|군립|구립|공립)/g;
const strip = (s = '') => norm(s).replace(ADMIN_WORDS, '');

/**
 * 이름 유사도 (0~1). 글자 2개씩 끊어 겹치는 비율을 본다(Dice 계수).
 *
 * 완전일치/부분포함 만으로는 "안산미디어도서관" 과 "안산시미디어도서관" 을
 * 다른 곳으로 판정해 버린다. 한국 도서관 이름은 '시'·'시립'·'광역시' 가
 * 붙었다 말았다 하므로 유사도로 보는 편이 훨씬 안정적이다.
 */
function similarity(a, b) {
  const bigrams = (s) => {
    const out = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const A = bigrams(a);
  const B = bigrams(b);
  let hits = 0;
  for (const [g, n] of A) hits += Math.min(n, B.get(g) ?? 0);

  const total = [...A.values()].reduce((x, y) => x + y, 0) + [...B.values()].reduce((x, y) => x + y, 0);
  return (2 * hits) / total;
}

/** 우리 132곳의 이름 집합. 다른 도서관이 검색에 끼어들었는지 판별하는 데 쓴다. */
const seedNameSet = new Set(seeds.map((s) => strip(s.name)));

/** 명백히 도서관이 아닌 후보를 걸러낸다 */
function isPlausible(doc) {
  if (REJECT_CATEGORY_CODES.has(doc.category_group_code)) return false;
  if (REJECT_NAME_WORDS.some((w) => (doc.place_name ?? '').includes(w))) return false;
  return true;
}

/** 후보가 우리가 찾는 그 도서관일 가능성을 점수로 매긴다 */
function score(doc, seed) {
  let s = 0;
  const addr = doc.road_address_name || doc.address_name || '';
  const place = norm(doc.place_name);
  const target = norm(seed.name);

  // 지역이 맞아야 한다. 이게 제일 중요하다.
  const prefixes = SIDO_PREFIXES[seed.sido] ?? [seed.sido];
  if (prefixes.some((p) => addr.startsWith(p))) s += 50;
  else s -= 40;

  // 시/군/구까지 아는 곳이면 더 확실하게
  if (seed.sigungu && addr.includes(seed.sigungu)) s += 15;

  // 이름 유사도 (행정 수식어를 걷어낸 뒤 비교)
  const sim = Math.max(similarity(place, target), similarity(strip(doc.place_name), strip(seed.name)));
  if (sim >= 0.95) s += 45;
  else if (sim >= 0.8) s += 35;
  else if (sim >= 0.62) s += 22;
  else if (sim >= 0.45) s += 5;
  else s -= 25;

  // 우리 목록의 *다른* 도서관 이름과 정확히 같으면 그 도서관이지 이 도서관이 아니다.
  // ('문학마을작은도서관' 을 찾는데 '문학마을도서관' 이 올라오는 경우)
  const strippedPlace = strip(doc.place_name);
  if (strippedPlace !== strip(seed.name) && seedNameSet.has(strippedPlace)) s -= 45;

  // 도서관/문화시설 카테고리면 가산
  const cat = doc.category_name ?? '';
  if (cat.includes('도서관')) s += 20;
  else if (doc.category_group_code === 'CT1') s += 5;

  return s;
}

async function searchKakao(query) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });

  if (res.status === 401 || res.status === 403) {
    console.error(`\n\n인증 실패 (${res.status}). REST API 키가 맞는지 확인하세요.`);
    console.error(await res.text());
    process.exit(1);
  }
  if (res.status === 429) {
    // 한도 초과 - 잠시 쉬고 한 번 더
    await sleep(2000);
    return searchKakao(query);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return (await res.json()).documents ?? [];
}

const entries = {};
const low = [];
const failed = [];

for (let i = 0; i < seeds.length; i++) {
  const seed = seeds[i];
  progress(i, seeds.length, seed.name);

  try {
    /**
     * 검색어에 시도를 붙이지 않는다.
     * 우리 지역 분류는 '경상'·'충청'·'전라' 같은 가이드북 기준이라 실제 지명이
     * 아니다. "경상 경북도서관" 으로 검색하면 엉뚱한 곳이 나온다.
     * 대신 시/군/구를 아는 곳만 붙이고, 지역 검증은 점수 계산에서 한다.
     */
    const queries = seed.sigungu ? [`${seed.sigungu} ${seed.name}`, seed.name] : [seed.name];

    const seen = new Set();
    const docs = [];
    for (const q of queries) {
      for (const d of await searchKakao(q)) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        docs.push(d);
      }
      await sleep(110);
    }

    const candidates = docs.filter(isPlausible);
    if (candidates.length === 0) {
      failed.push(seed);
      continue;
    }

    const best = candidates
      .map((d) => ({ doc: d, s: score(d, seed) }))
      .sort((a, b) => b.s - a.s)[0];

    // 60점 미만이면 다른 곳일 가능성이 높다. 채우지 않는다.
    if (best.s < 60) {
      low.push({ seed, guess: best.doc.place_name, addr: best.doc.road_address_name, s: best.s });
      continue;
    }

    const d = best.doc;
    const lat = Number(d.y);
    const lng = Number(d.x);

    entries[seed.id] = {
      source: 'kakao',
      confidence: best.s >= 100 ? 'high' : 'medium',
      matchedName: d.place_name,
      address: d.road_address_name || d.address_name || undefined,
      phone: d.phone || undefined,
      coords: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
      placeUrl: d.place_url || undefined,
    };
    for (const k of Object.keys(entries[seed.id])) {
      if (entries[seed.id][k] === undefined) delete entries[seed.id][k];
    }
  } catch (e) {
    failed.push(seed);
  }

  await sleep(120); // 예의상 간격
}

process.stdout.write('\n\n');

/* ── 저장 ─────────────────────────────────────────────────── */
const outPath = path.join(ROOT, 'src/data/libraries.geocoded.json');
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      _readme: [
        '카카오 로컬 API 로 자동 수집한 좌표·주소·전화입니다. 직접 고치지 마세요.',
        '생성: npm run geocode',
        '우선순위: geocoded < enriched(정보나루) < manual(수동). 뒤쪽이 앞쪽을 덮습니다.',
        'confidence 가 medium 인 곳은 다른 장소일 수 있으니 확인이 필요합니다.',
      ],
      _generatedAt: new Date().toISOString(),
      entries,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

/* ── 보고 ─────────────────────────────────────────────────── */
const ok = Object.keys(entries).length;
const high = Object.values(entries).filter((e) => e.confidence === 'high').length;
const withPhone = Object.values(entries).filter((e) => e.phone).length;

console.log('─'.repeat(52));
console.log(`채움      ${ok} / ${seeds.length}곳   (확신 높음 ${high}, 보통 ${ok - high})`);
console.log(`  주소·좌표 ${ok}곳 / 전화번호 ${withPhone}곳`);
console.log(`확신 부족  ${low.length}곳 — 비워 뒀습니다`);
console.log(`검색 실패  ${failed.length}곳`);

if (low.length > 0) {
  console.log('\n확신이 부족해 건너뛴 곳 (수동 확인 필요):');
  for (const l of low.slice(0, 20)) {
    console.log(`  ${l.seed.name} (${l.seed.sido})  ← 후보: ${l.guess} / ${l.addr ?? '주소없음'} [${l.s}점]`);
  }
  if (low.length > 20) console.log(`  ... 외 ${low.length - 20}곳`);
}
if (failed.length > 0) {
  console.log('\n검색 결과가 아예 없던 곳:');
  for (const f of failed) console.log(`  ${f.name} (${f.sido})`);
}

const manualList = [...low.map((l) => l.seed), ...failed];
if (manualList.length > 0) {
  const csv = [
    'id,name,sido,sigungu,address,phone,homepage',
    ...manualList.map((s) => `${s.id},${s.name},${s.sido},${s.sigungu ?? ''},,,`),
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'libraries.unmatched.csv'), '﻿' + csv, 'utf8');
  console.log(`\n손으로 채울 목록 → libraries.unmatched.csv (${manualList.length}곳)`);
}
console.log('─'.repeat(52));
console.log('→ src/data/libraries.geocoded.json 갱신 완료');
