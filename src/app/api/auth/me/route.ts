import { readSession } from '@/server/auth/session';
import { buildMockUser } from '@/lib/auth/simpleLogin';
import { type NextRequest, NextResponse } from 'next/server';

/** 화면은 숫자 id 를 쓴다(알림 구독 키). IdP 의 sub(UUID)를 32비트 양수로 바꾼다(FNV-1a) */
const numericIdOf = (sub: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < sub.length; i += 1) {
    hash ^= sub.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0 || 1;
};

// 현재 로그인한 사용자 조회 - 브라우저는 세션 쿠키만 들고 있고, 누구인지는 서버가 판단한다
export async function GET(req: NextRequest) {
  // 1. 세션 읽기 - 없거나 서명, 만료가 틀리면 401 (쿠키를 위조해도 여기서 걸린다)
  const session = await readSession(req.cookies);
  if (!session) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 2. OIDC 세션은 ID 토큰의 이름, 이메일을 쓴다. 데모 세션은 sub(loginId)로 데모 사용자를 만든다
  if (session.tokens) {
    return NextResponse.json({
      user: {
        id: numericIdOf(session.sub),
        name: session.name ?? session.sub,
        email: session.email ?? '',
        role: session.role,
      },
    });
  }
  const user = buildMockUser(session.sub);
  return NextResponse.json({ user });
}
