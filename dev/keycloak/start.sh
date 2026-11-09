#!/usr/bin/env bash
# 로컬 Keycloak(OIDC IdP)을 띄운다. 인증 4단계 카드, 계획 결정 10.
# 필요: Keycloak 26.8.1 압축 해제본(KEYCLOAK_HOME), Java 21, dev/keycloak/.env.keycloak(아래 변수, git 에 안 올림)
#   KC_BOOTSTRAP_ADMIN_USERNAME, KC_BOOTSTRAP_ADMIN_PASSWORD  관리 콘솔 계정
#   KC_EVERP_BFF_SECRET                                      everp-bff client secret(.env.oidc 의 OIDC_CLIENT_SECRET 과 같은 값)
#   KC_DEMO_PASSWORD                                         realm 사용자 3명(admin, fcm_admin, supplier) 비밀번호
# 앱은 OIDC 모드로 3100 포트 하나에서 띄운다(npm run dev:oidc). 콜백, 백채널 주소가 3100 으로 고정돼 있다
# 실행: bash dev/keycloak/start.sh  → http://localhost:8180/realms/everp/.well-known/openid-configuration
set -euo pipefail
# 포트 8180: 이 맥의 8080 은 다른 서버가 쓰고 있다
DIR="$(cd "$(dirname "$0")" && pwd)"
KEYCLOAK_HOME="${KEYCLOAK_HOME:-$HOME/tools/keycloak-26.8.1}"
JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 21 2>/dev/null || echo /opt/homebrew/opt/openjdk@21)}"
export JAVA_HOME
# kc.sh 가 서버 JVM 을 다시 띄울 때 PATH 의 java 를 쓴다. 21 을 앞에 둔다
export PATH="$JAVA_HOME/bin:$PATH"
set -a
# shellcheck disable=SC1091
source "$DIR/.env.keycloak"
set +a
mkdir -p "$KEYCLOAK_HOME/data/import"
cp "$DIR/everp-realm.json" "$KEYCLOAK_HOME/data/import/everp-realm.json"
exec "$KEYCLOAK_HOME/bin/kc.sh" start-dev --http-port 8180 --import-realm
