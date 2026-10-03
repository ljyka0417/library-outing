# 대출 가능 여부 중계 서버 (Cloudflare Workers)

앱이 "이 도서관에 이 책 지금 빌릴 수 있나"를 묻는 곳. 정보나루 키는 여기에만 둔다
(앱에 넣으면 누구나 앱 파일에서 꺼낼 수 있다). 자세한 동작은 `src/index.js` 맨 위 설명.

같은 서버가 공공데이터포털 키(`DATA_GO_KR_KEY`)로 날씨(`/weather`, `src/weather.js`), 미세먼지(`/air`, `src/air.js` —
측정소 위치는 `npm run collect-air-stations` 로 받은 `src/air-stations.js`)와
도서관 근처 공연·전시(`/culture`, `/culture/detail`, `src/culture.js`)도 중계한다.

## 처음 올리기 (한 번만)

1. Cloudflare 가입 (무료): https://dash.cloudflare.com/sign-up
2. 이 폴더에서 로그인 — 브라우저가 열리면 "허용"
   ```
   cd server/loan-proxy
   npx wrangler login
   ```
3. 올리기 — 끝나면 `https://larchive-loan.<내 이름>.workers.dev` 주소가 나온다
   ```
   npx wrangler deploy
   ```
4. 정보나루 키를 비밀 변수로 넣기 (채팅·코드에 붙여 넣지 않는다). 물어보면 키를 붙여 넣는다
   ```
   npx wrangler secret put DATA4LIBRARY_KEY
   npx wrangler secret put DATA_GO_KR_KEY
   ```
   공공데이터포털 키는 기상청 단기예보, 에어코리아 대기오염정보·측정소정보, 한국문화정보원 한눈에보는문화정보를 각각 활용신청해 둬야 한다
5. 3번에서 나온 주소를 `src/config/loanProxy.ts` 의 `LOAN_PROXY_URL` 에 넣는다

## 고친 뒤 다시 올리기

- 도서관 목록이 바뀌면: `npm run loan-proxy-libs` 후 `npx wrangler deploy`
- 내 컴퓨터에서 먼저 시험: `node --env-file=../../.env test-local.mjs`
- 무료 사용량: 하루 10만 번 요청.
- 같은 질문은 모든 사용자가 함께 쓰는 KV(LOAN_KV)에 기억한다 — 책이 없는 도서관은 3일, 있는 곳은 30분,
  책 검색은 하루. 정보나루 하루 500건 한도를 아낀다. KV 무료 한도는 읽기 하루 10만, 쓰기 하루 1천
  (쓰기는 정보나루에 실제로 물은 만큼만 생기므로 500건 한도보다 적다). 처음 만들 때:
  `npx wrangler kv namespace create LOAN_KV` 로 만들고 나온 id 를 wrangler.toml 에 적는다
