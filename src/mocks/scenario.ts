import { delay, http, HttpResponse } from 'msw';

/**
 * 실패 시나리오 스위치. 요청 헤더 `x-mock-scenario` 또는 쿼리 `?mockScenario=` 로 켠다.
 * 옛 `?mockError=true` 와 `x-mock-error: true` 는 `500` 의 별칭이다.
 *
 *   network  연결 끊김 (XHR error 이벤트)
 *   timeout  axios 타임아웃(4초)보다 늦게 응답. `x-mock-delay` 로 ms 조정
 *   401 403 404 409 500  해당 상태 코드와 `{ success: false, message }`
 *   shape    2xx 인데 `data` 필드가 없는 응답
 */
export const MOCK_SCENARIOS = [
  'network',
  'timeout',
  '401',
  '403',
  '404',
  '409',
  '500',
  'shape',
] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

const isScenario = (value: string | null): value is MockScenario =>
  value !== null && (MOCK_SCENARIOS as readonly string[]).includes(value);

export const scenarioOf = (request: Request): MockScenario | null => {
  const url = new URL(request.url);
  const fromHeader = request.headers.get('x-mock-scenario');
  if (isScenario(fromHeader)) return fromHeader;
  const fromQuery = url.searchParams.get('mockScenario');
  if (isScenario(fromQuery)) return fromQuery;
  if (
    url.searchParams.get('mockError') === 'true' ||
    request.headers.get('x-mock-error') === 'true'
  ) {
    return '500';
  }
  return null;
};

const STATUS_MESSAGE: Record<'401' | '403' | '404' | '409' | '500', string> = {
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '409': 'Conflict',
  '500': 'Internal Server Error',
};

export const DEFAULT_TIMEOUT_DELAY_MS = 5000;

export const scenarioResponse = async (
  scenario: MockScenario,
  options: { delayMs?: number } = {},
): Promise<Response> => {
  switch (scenario) {
    case 'network':
      return HttpResponse.error();
    case 'timeout':
      await delay(options.delayMs ?? DEFAULT_TIMEOUT_DELAY_MS);
      return HttpResponse.json({ status: 200, success: true, message: 'late', data: null });
    case 'shape':
      return HttpResponse.json({ status: 200, success: true, message: 'OK' });
    case '401':
    case '403':
    case '404':
    case '409':
    case '500': {
      const status = Number(scenario);
      return HttpResponse.json(
        { status, success: false, message: STATUS_MESSAGE[scenario] },
        { status },
      );
    }
  }
};

/** 모든 핸들러보다 앞에 둔다. 시나리오 지시가 없으면 다음 핸들러로 넘긴다. */
export const scenarioHandler = http.all('*', async ({ request }) => {
  const scenario = scenarioOf(request);
  if (!scenario) return undefined;
  const delayHeader = request.headers.get('x-mock-delay');
  const delayMs = delayHeader ? Number(delayHeader) : undefined;
  return scenarioResponse(scenario, { delayMs });
});
