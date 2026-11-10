#!/usr/bin/env bash
# Lighthouse CI 를 돌린다(CI 고도화 2). 먼저 pnpm build 가 끝나 있어야 한다.
# next start 를 3200 포트로 띄우고, 데모 관리자로 로그인해 세션 쿠키를 받아 LH_COOKIE 로 넘긴다.
set -euo pipefail

PORT=3200
BASE="http://localhost:${PORT}"
JAR="$(mktemp)"

pnpm exec next start --port "$PORT" > .lighthouseci-server.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; rm -f "$JAR"' EXIT

for _ in $(seq 1 60); do
  curl -sf "$BASE/login" > /dev/null && break
  sleep 1
done

curl -sf -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' -H "Origin: $BASE" \
  -d '{"loginId":"admin"}' > /dev/null

# 쿠키 파일의 마지막 두 칸이 이름과 값이다. httpOnly 쿠키는 #HttpOnly_ 로 시작하는 줄에 있다
LH_COOKIE="$(awk '!/^# / && NF >= 7 { printf "%s=%s; ", $6, $7 }' "$JAR")"
if [ -z "$LH_COOKIE" ]; then
  echo "데모 로그인 쿠키를 못 받았다" >&2
  exit 1
fi
export LH_COOKIE LH_BASE_URL="$BASE"

pnpm exec lhci autorun --config=perf/lighthouserc.cjs
