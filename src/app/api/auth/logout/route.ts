import { endSession } from '@/server/auth/session';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // 1. 응답 객체 생성 - 쿠키 삭제 명령은 응답 헤더(Set-Cookie)에 실리기 때문
  const res = NextResponse.json({ message: 'OK' });

  // 2. 저장소의 세션과 쿠키를 지운다(name, path 맞추기는 세션 모듈이 한다)
  await endSession(res, req.cookies);

  // 3. res 반환
  return res;
}
