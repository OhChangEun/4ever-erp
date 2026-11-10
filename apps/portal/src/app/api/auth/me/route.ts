import { NextResponse, type NextRequest } from 'next/server';
import { readSession } from '@portal/server/auth';

/** 지금 세션. e2e 가 백채널 로그아웃 뒤 401 을 확인한다. 토큰은 내보내지 않는다 */
export async function GET(req: NextRequest) {
  const session = await readSession(req.cookies);
  if (!session) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  return NextResponse.json({
    user: { sub: session.sub, role: session.role, name: session.name, email: session.email },
  });
}
