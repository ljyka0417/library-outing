/**
 * 중계 서버를 올리기 전에 내 컴퓨터에서 시험한다 (Cloudflare 없이).
 *   node --env-file=../../.env test-local.mjs
 * 키는 .env 의 DATA4LIBRARY_KEY 를 쓴다. 화면에 키를 찍지 않는다.
 */
import { handle } from './src/index.js';

const env = { DATA4LIBRARY_KEY: process.env.DATA4LIBRARY_KEY };
const ask = async (q) => {
  const res = await handle(new Request(`https://x.dev${q}`), env);
  console.log(res.status, q, '\n ', JSON.stringify(await res.json()));
};
await ask('/loan?lib=111314&isbn=9788936434120,9788954646079,9791161571188');
await ask('/loan?lib=999999&isbn=9788936434120');   // 앱에 없는 도서관 → 400
await ask('/loan?lib=111314&isbn=123');             // ISBN 형식 → 400
await ask('/other');                                 // 없는 주소 → 404
await ask('/where?isbn=9788936434120&libs=111314,111071,111102');   // 한 권을 여러 도서관에
await ask('/where?isbn=9788936434120&libs=999999');                 // 앱에 없는 도서관 → 400
