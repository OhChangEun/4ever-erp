import { NextResponse, type NextRequest } from 'next/server';
import * as z from 'zod';

/**
 * web-vitals 수집(옵저버빌리티 1). 브라우저가 sendBeacon 으로 지표 하나를 보낸다(src/app/components/WebVitals.tsx).
 * 지금은 Vercel 함수 로그에 한 줄씩 남긴다. 외부 수집(Speed Insights, Sentry)을 켜면 여기서 넘긴다.
 * 인증 없이 받는 경로라 크기와 모양을 먼저 본다.
 */
const MAX_BYTES = 2048;

const metricSchema = z.object({
  name: z.enum(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']),
  value: z.number().finite().nonnegative(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  id: z.string().max(64),
  navigationType: z.string().max(32).optional(),
  path: z.string().max(256),
});

export async function POST(request: NextRequest) {
  const text = await request.text();
  if (text.length > MAX_BYTES) return new NextResponse(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = metricSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  console.info(JSON.stringify({ evt: 'web-vital', ...parsed.data }));
  return new NextResponse(null, { status: 204 });
}
