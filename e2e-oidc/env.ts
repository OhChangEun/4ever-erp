import { readFileSync } from 'node:fs';

/** dev/keycloak 의 env 파일(git 에 안 올림)을 읽는다. 설정 파일과 테스트 워커가 같이 쓴다 */
export const readEnvFile = (path: string): Record<string, string> =>
  Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
  );

/** 앱 서버에 넘기는 값 */
export const oidcEnv = () => readEnvFile('dev/keycloak/.env.oidc');
/** 테스트 러너만 쓰는 값(Keycloak 관리 계정) */
export const keycloakEnv = () => readEnvFile('dev/keycloak/.env.keycloak');
/** SSO 포털(apps/portal) 서버에 넘기는 값 */
export const portalEnv = () => readEnvFile('dev/keycloak/.env.portal');
