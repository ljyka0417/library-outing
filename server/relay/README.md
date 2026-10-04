# 정보나루 고정 IP 중계

정보나루 Open API는 **하루 500건**, 부르는 서버의 IP를 등록하면 **하루 30,000건**까지 쓸 수 있다.
Cloudflare Worker(`server/loan-proxy`)는 나가는 IP가 고정이 아니라 등록할 수 없어서, 고정 IP 서버에서 이 중계를 돌린다.

```
앱 → Cloudflare Worker (캐시) → 이 중계 (고정 IP, 키 보관) → data4library.kr
```

- 키는 중계 서버의 `/etc/larchive-relay.env`에만 있다. 저장소에는 없다.
- Worker는 `RELAY_URL`, `RELAY_SECRET` 비밀 변수가 있으면 중계를 거치고, 없거나 중계가 답하지 않으면 예전처럼 직접 부른다(하루 500건).

## 설치 (오라클 클라우드 Always Free, Ubuntu)

1. 인스턴스를 만들고 **예약된 공인 IP**를 붙인다(서버를 껐다 켜도 IP가 바뀌지 않게).
2. VCN → 보안 목록에서 TCP **80, 443** 수신을 연다.
3. SSH로 접속해서:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/ljyka0417/library-outing/main/server/relay/setup.sh -o setup.sh && sudo bash setup.sh
   ```
   정보나루 키를 물으면 붙여 넣는다(화면에 안 보인다). 끝나면 IP·주소·비밀값을 보여 준다.
4. 정보나루 마이페이지에 그 **IP**를 등록한다.
5. 내 컴퓨터 `server/loan-proxy`에서:
   ```bash
   npx wrangler secret put RELAY_URL      # https://<IP를-로-이은>.sslip.io
   npx wrangler secret put RELAY_SECRET   # setup.sh 가 보여 준 값
   ```

## 확인

- `curl https://<주소>/health` → `ok 날짜 오늘호출수`
- 서버에서 `systemctl status larchive-relay`, `journalctl -u larchive-relay -n 50`
- 중계 프로그램 고치기: `relay.mjs`를 고쳐 올린 뒤 서버에서 `sudo bash setup.sh`를 다시 실행(키는 다시 묻지 않는다)
