/** .env 를 읽는 최소 구현. dotenv 를 새로 깔 만큼의 일이 아니다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function env(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return '';
  const m = fs.readFileSync(envPath, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

export function requireEnv(name, help) {
  const v = env(name);
  if (!v) {
    console.error(`\n${name} 이(가) .env 에 없습니다.\n\n${help}\n`);
    process.exit(1);
  }
  return v;
}

/** 우리 132곳 시드를 읽는다 (id / name / 지역) */
export function readSeeds() {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/libraries.mock.ts'), 'utf8');
  const seeds = [
    ...src.matchAll(/\{ id: '([^']+)', name: '([^']+)', sido: '([^']+)'(?:, sigungu: '([^']+)')?/g),
  ].map((m) => ({ id: m[1], name: m[2], sido: m[3], sigungu: m[4] }));

  if (seeds.length === 0) {
    console.error('도서관 목록을 읽지 못했습니다. src/data/libraries.mock.ts 를 확인하세요.');
    process.exit(1);
  }
  return seeds;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 진행률 한 줄 출력 */
export function progress(i, total, label) {
  const pct = Math.round(((i + 1) / total) * 100);
  process.stdout.write(`\r  [${String(i + 1).padStart(3)}/${total}] ${pct}%  ${label.padEnd(30).slice(0, 30)}`);
}
