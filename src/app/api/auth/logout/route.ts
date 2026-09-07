import { SESSION_COOKIE } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

export async function POST() {
  // 1. 응답 객체 생성 - 쿠키 삭제 명령은 응답 헤더(Set-Cookie)에 실리기 때문
  const res = NextResponse.json({ message: 'OK' });

  // 2. 세션 쿠키 삭제 - name과 path가 심을 때와 같아야 브라우저가 같은 쿠키로 본다.
  res.cookies.delete({ name: SESSION_COOKIE, path: '/' });

  // 3. res 반환
  return res;
}
