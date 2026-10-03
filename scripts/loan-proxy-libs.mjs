/**
 * 대출 가능 여부 중계 서버(server/loan-proxy)가 받아 줄 도서관 코드 목록을 만든다.
 *
 *   npm run loan-proxy-libs
 *
 * 중계 서버가 아무 도서관이나 물어봐 주면 남이 우리 키로 정보나루를 마구 부를 수 있다.
 * 그래서 이 앱에 실린 도서관(정보나루 코드가 있는 곳)만 받는다.
 * 도서관 목록이 바뀌면 이걸 다시 돌리고 중계 서버를 다시 올린다 (npx wrangler deploy).
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readSeeds } from './lib/env.mjs';

const enriched = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/libraries.enriched.json'), 'utf8')).entries ?? {};
const codes = [...new Set(readSeeds().map((s) => enriched[s.id]?.sourceApiId).filter(Boolean))].sort();
const out = path.join(ROOT, 'server/loan-proxy/src/libs.js');
fs.writeFileSync(out, `// npm run loan-proxy-libs 가 만든다. 직접 고치지 마세요.\nexport default ${JSON.stringify(codes)};\n`);
console.log(`도서관 코드 ${codes.length}곳 → ${path.relative(ROOT, out)}`);
