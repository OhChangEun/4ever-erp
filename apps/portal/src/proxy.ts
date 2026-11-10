import { NextResponse } from 'next/server';

/**
 * 포털은 화면마다 세션을 본다(src/server/page.ts 의 requireSession). 프록시는 지나가게만 한다.
 * 이 파일이 있어야 하는 이유: 없으면 Next 16.3.4 의 Turbopack 이 저장소 루트(erp)의 src/proxy.ts 를
 * 이 앱 것으로 집어 erp 의 import(@/lib/...)를 못 찾고 빌드가 깨진다(webpack 빌드는 괜찮았다).
 */
export function proxy() {
  return NextResponse.next();
}

export const config = { matcher: [] };
