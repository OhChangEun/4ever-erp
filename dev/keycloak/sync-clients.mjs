// 떠 있는 로컬 Keycloak 에 realm 파일의 클라이언트를 반영한다(SSO 포털 카드).
// start.sh 의 --import-realm 은 realm 이 이미 있으면 건너뛰어, 나중에 더한 클라이언트(everp-portal)가 안 들어간다.
// 실행: node dev/keycloak/sync-clients.mjs   (값은 dev/keycloak/.env.keycloak, git 에 안 올림)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(path.join(dir, '.env.keycloak'), 'utf8')
    .split('\n')
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
// realm 파일의 ${KC_...} 를 env 값으로(Keycloak 가져오기와 같은 규칙)
const raw = readFileSync(path.join(dir, 'everp-realm.json'), 'utf8').replace(
  /\$\{([A-Z0-9_]+)\}/g,
  (_, name) => {
    if (!env[name]) throw new Error(`.env.keycloak 에 ${name} 가 없다`);
    return env[name];
  },
);
const realm = JSON.parse(raw);
const KC = process.env.KC_URL ?? 'http://localhost:8180';

const tokenRes = await fetch(`${KC}/realms/master/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: env.KC_BOOTSTRAP_ADMIN_USERNAME,
    password: env.KC_BOOTSTRAP_ADMIN_PASSWORD,
  }),
});
if (!tokenRes.ok) throw new Error(`관리자 토큰 실패 ${tokenRes.status}`);
const { access_token: token } = await tokenRes.json();
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
const base = `${KC}/admin/realms/${realm.realm}/clients`;

for (const client of realm.clients) {
  const found = await (
    await fetch(`${base}?clientId=${encodeURIComponent(client.clientId)}`, { headers })
  ).json();
  const res = found[0]
    ? await fetch(`${base}/${found[0].id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...found[0], ...client, id: found[0].id }),
      })
    : await fetch(base, { method: 'POST', headers, body: JSON.stringify(client) });
  if (!res.ok) throw new Error(`${client.clientId} 반영 실패 ${res.status} ${await res.text()}`);
  console.log(`${client.clientId}: ${found[0] ? '고침' : '만듦'}`);
}
