'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * 실제 사용자의 LCP, INP, CLS 등을 /api/vitals 로 보낸다(옵저버빌리티 1).
 * 클라이언트 경계를 이 컴포넌트 하나로 좁히려고 루트 레이아웃에 따로 둔다(Next 문서 권장).
 * 화면을 떠날 때도 보내지도록 sendBeacon, 안 되면 keepalive fetch.
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      path: window.location.pathname,
    });
    if (!navigator.sendBeacon('/api/vitals', body)) {
      void fetch('/api/vitals', { method: 'POST', body, keepalive: true });
    }
  });
  return null;
}
