import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

// 1. 비밀키 준비 - 쓰는 시점에 읽는다. import 시점에 읽으면 Next 빌드가 라우트 모듈을
//    평가하다가 env 없는 빌드 머신에서 죽는다(2026-11-09 Vercel 배포 7건 실패).
//    없으면 로그인과 검증을 부를 때 throw 한다. null 로 숨기면 "로그인이 풀렸다"로 보여 설정 오류를 못 찾는다.
let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const rawSecret = process.env.SESSION_SECRET;
  if (!rawSecret) {
    throw new Error('SESSION_SECRET is not set');
  }
  // jose는 문자열이 아니라 바이트 배열(Uint8Array)을 받는다
  cachedSecret = new TextEncoder().encode(rawSecret);
  return cachedSecret;
}

// 2. 세션 payload 타입 - 쿠키 안에 들어갈 값
export interface SessionPayload {
  sub: string; // loginId (JWT 표준 claim "subject")
  role: string;
}

// 3. 검증 후 payload type guard
function isSessionPayload(value: unknown): value is SessionPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sub' in value &&
    typeof value.sub === 'string' &&
    'role' in value &&
    typeof value.role === 'string'
  );
}

// 4. 서명 - payload를 받아 JWT 문자열을 돌려준다
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role }) // 커스텀 claim
    .setSubject(payload.sub) // 표준 claim: sub
    .setProtectedHeader({ alg: 'HS256' }) // header (필수)
    .setIssuedAt() // iat: 지금
    .setExpirationTime('1d') // exp: 쿠키 maxAge(86400초)와 동일하게
    .sign(getSecret());
}

// 5. 검증 - 서명/만료/형식 중 하나라도 틀리면 null
export async function verifySession(token: string): Promise<SessionPayload | null> {
  // 비밀키 없음은 설정 오류라 try 밖에서 throw 한다. 아래 catch 는 토큰 문제만 null 로 바꾼다.
  const secret = getSecret();
  try {
    // alg 고정: header를 none 등으로 바꿔치기하는 공격 차단
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    if (!isSessionPayload(payload)) {
      return null;
    }

    // iat, exp 같은 부가 정보는 버리고 필요한 것만 돌려준다
    return { sub: payload.sub, role: payload.role };
  } catch {
    // 서명 불일치, 만료, 깨진 토큰 전부 여기로 온다
    return null;
  }
}

// 6. 쿠키 이름 - login, logout, me, proxy 네 곳에서 같은 문자열을 써야 한다
export const SESSION_COOKIE = 'session';
