#!/usr/bin/env bash
# 정보나루 고정 IP 중계 설치 (오라클 클라우드 Ubuntu 22.04/24.04 무료 서버에서 한 번 실행)
#
#   curl -fsSL https://raw.githubusercontent.com/ljyka0417/library-outing/main/server/relay/setup.sh -o setup.sh && sudo bash setup.sh
#
# 하는 일
#   1. Node 22 와 Caddy(HTTPS 인증서를 알아서 받는 웹 서버) 설치
#   2. 정보나루 키를 화면에 안 보이게 입력받아 /etc/larchive-relay.env 에 저장 (이 파일만 키를 안다)
#   3. Worker 만 부를 수 있게 비밀값(RELAY_SECRET)을 새로 만든다
#   4. 중계 프로그램을 자동 시작(systemd)으로 등록하고, https://<IP>.sslip.io 주소로 연다
#   5. 마지막에 "정보나루에 등록할 IP" 와 "Worker 에 넣을 두 값" 을 보여 준다
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "sudo bash setup.sh 로 실행해 주세요"; exit 1; fi

echo "== 1/5 패키지 설치"
apt-get update -y
apt-get install -y curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https openssl iptables-persistent
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "== 2/5 중계 프로그램"
mkdir -p /opt/larchive-relay
curl -fsSL https://raw.githubusercontent.com/ljyka0417/library-outing/main/server/relay/relay.mjs -o /opt/larchive-relay/relay.mjs

echo "== 3/5 키와 비밀값"
if [ ! -f /etc/larchive-relay.env ]; then
  read -rsp "정보나루 인증키를 붙여 넣고 엔터 (화면에 안 보여요): " D4L_KEY; echo
  if [ -z "$D4L_KEY" ]; then echo "키가 비어 있어요"; exit 1; fi
  SECRET="$(openssl rand -hex 24)"
  umask 077
  printf 'DATA4LIBRARY_KEY=%s\nRELAY_SECRET=%s\nPORT=8787\n' "$D4L_KEY" "$SECRET" > /etc/larchive-relay.env
  unset D4L_KEY
fi
chmod 600 /etc/larchive-relay.env
SECRET="$(grep '^RELAY_SECRET=' /etc/larchive-relay.env | cut -d= -f2)"

cat > /etc/systemd/system/larchive-relay.service <<'UNIT'
[Unit]
Description=Larchive data4library relay
After=network-online.target

[Service]
EnvironmentFile=/etc/larchive-relay.env
ExecStart=/usr/bin/node /opt/larchive-relay/relay.mjs
Restart=always
RestartSec=3
DynamicUser=yes

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now larchive-relay
systemctl restart larchive-relay

echo "== 4/5 HTTPS 주소 (sslip.io + Caddy)"
IP="$(curl -fsS https://api.ipify.org)"
HOST="$(echo "$IP" | tr '.' '-').sslip.io"
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
  reverse_proxy 127.0.0.1:8787
}
CADDY
# 오라클 Ubuntu 는 서버 안 방화벽이 80·443 을 막아 둔다 — 연다 (웹 콘솔의 보안 규칙도 따로 열어야 한다)
# 규칙은 위에서부터 걸린다. "나머지 거부(REJECT)" 줄보다 위에 넣어야 한다 — 번호를 못 박아 넣었다가
# 규칙이 5줄뿐인 서버에서 거부 줄 아래로 들어가 80·443 이 계속 막혔다.
for p in 80 443; do
  while iptables -C INPUT -p tcp --dport "$p" -m state --state NEW -j ACCEPT 2>/dev/null; do
    iptables -D INPUT -p tcp --dport "$p" -m state --state NEW -j ACCEPT
  done
  REJECT_AT="$(iptables -L INPUT --line-numbers -n | awk '/REJECT/{print $1; exit}')"
  iptables -I INPUT "${REJECT_AT:-1}" -p tcp --dport "$p" -m state --state NEW -j ACCEPT
done
netfilter-persistent save >/dev/null 2>&1 || true
systemctl restart caddy

echo "== 5/5 확인"
sleep 3
curl -fsS http://127.0.0.1:8787/health && echo " ← 중계 프로그램 OK"

cat <<DONE

────────────────────────────────────────────────────────
설치 끝! 아래 값을 쓰세요 (채팅에 붙여 넣지 마세요)

① 정보나루 마이페이지 → 서버 IP 등록:   $IP
② Worker 에 넣을 값 (내 컴퓨터 server/loan-proxy 에서):
   npx wrangler secret put RELAY_URL      →  https://$HOST
   npx wrangler secret put RELAY_SECRET   →  $SECRET

HTTPS 인증서는 처음 접속 때 1분쯤 걸려 받아집니다.
확인:  curl https://$HOST/health   (ok 가 나오면 성공)
────────────────────────────────────────────────────────
DONE
