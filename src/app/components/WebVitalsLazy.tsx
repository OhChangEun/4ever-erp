'use client';

import dynamic from 'next/dynamic';

/**
 * WebVitals 를 첫 로드 JS 에서 뺀다. 루트 레이아웃은 서버 컴포넌트라 ssr:false 동적 import 를
 * 바로 쓸 수 없어 이 얇은 클라이언트 껍데기를 둔다. 지표는 그려진 뒤에 재므로 늦게 받아도 된다.
 */
const WebVitals = dynamic(() => import('./WebVitals'), { ssr: false });

export default function WebVitalsLazy() {
  return <WebVitals />;
}
