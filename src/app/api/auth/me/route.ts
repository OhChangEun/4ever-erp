import { readSession } from '@/server/auth/session';
import { buildMockUser } from '@/lib/auth/simpleLogin';
import { NextRequest, NextResponse } from 'next/server';

// 현재 로그인한 사용자 조회 - 브라우저는 세션 쿠키만 들고 있고, 누구인지는 서버가 판단한다
export async function GET(req: NextRequest) {
  // 1. 세션 읽기 - 없거나 서명, 만료가 틀리면 401 (쿠키를 위조해도 여기서 걸린다)
  const session = await readSession(req.cookies);
  if (!session) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 3. 세션의 sub(loginId)로 사용자 정보를 만들어 돌려준다
  const user = buildMockUser(session.sub);
  return NextResponse.json({ user });
}
