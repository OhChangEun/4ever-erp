// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/** web-vitals 수집(옵저버빌리티 1). 브라우저가 sendBeacon 으로 보낸 지표를 확인하고 로그 한 줄 */
const send = (body: string) =>
  POST(new NextRequest('http://localhost/api/vitals', { method: 'POST', body }));

const metric = {
  name: 'LCP',
  value: 1234.5,
  rating: 'good',
  id: 'v5-123',
  navigationType: 'navigate',
  path: '/purchase',
};

describe('POST /api/vitals', () => {
  afterEach(() => vi.restoreAllMocks());

  it('올바른 지표는 204 와 로그 한 줄(JSON)', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const res = await send(JSON.stringify(metric));
    expect(res.status).toBe(204);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      evt: 'web-vital',
      name: 'LCP',
      value: 1234.5,
      path: '/purchase',
    });
  });

  it('모양이 틀리면 400', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    expect((await send(JSON.stringify({ name: 'LCP' }))).status).toBe(400);
    expect((await send('not json')).status).toBe(400);
  });

  it('너무 큰 본문은 413', async () => {
    const res = await send(JSON.stringify({ ...metric, path: 'x'.repeat(5000) }));
    expect(res.status).toBe(413);
  });
});
