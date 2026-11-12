import { HttpResponse } from 'msw';

export const now = new Date();
export const isoNow = now.toISOString();

export const stat = { value: 1200, delta_rate: 0.12 };

/** 기간별 추이 길이(시각화 1). 주는 일, 월과 분기는 주, 연은 월 */
export const TREND_LENGTH = { week: 7, month: 5, quarter: 13, year: 12 } as const;

/**
 * 지표 이름으로 정해지는 추이. 매번 같은 값이라 테스트가 흔들리지 않는다. 마지막 점이 지금 값이다.
 * 이름 글자로 씨앗을 만들고 ±15% 안에서 움직인다.
 */
export const trendOf = (name: string, value: number, length: number): number[] => {
  let seed = [...name].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9973, 7);
  const points = Array.from({ length: length - 1 }, () => {
    seed = (seed * 48271) % 2147483647;
    const swing = ((seed % 1000) / 1000 - 0.5) * 0.3;
    return Math.round(value * (1 + swing));
  });
  return [...points, value];
};

type StatLike = { value: number; delta_rate: number };
type Period = keyof typeof TREND_LENGTH;

/** 지표 하나에 그 기간 길이의 추이를 붙인다 */
export const trendStat = (period: Period, name: string, s: StatLike) => ({
  ...s,
  trend: trendOf(`${period}:${name}`, s.value, TREND_LENGTH[period]),
});

/** `{ 지표: stat }` 를 받아 네 기간을 만들고, 지표마다 기간 길이의 추이를 붙인다 */
export const statResponse = (data: Record<string, StatLike>) => {
  const withTrend = (period: Period) =>
    Object.fromEntries(Object.entries(data).map(([name, s]) => [name, trendStat(period, name, s)]));
  return {
    week: withTrend('week'),
    month: withTrend('month'),
    quarter: withTrend('quarter'),
    year: withTrend('year'),
  };
};

export const makePage = (page = 0, size = 10, totalElements = 2) => {
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  return {
    number: page,
    size,
    totalElements,
    totalPages,
    hasNext: page + 1 < totalPages,
  };
};

export const ok = <T>(data: T) =>
  HttpResponse.json({ status: 200, success: true, message: 'OK', data });
export const okNoData = () => HttpResponse.json({ status: 200, success: true, message: 'OK' });
export const error = (message = 'Mock error', status = 500) =>
  HttpResponse.json({ status, success: false, message }, { status });
/**
 * 주소 경로를 뒤에서 센 조각(1 이 마지막). RegExp 로 등록한 핸들러는 params 가 없어 주소에서 id 를 꺼낸다.
 * 끝 슬래시는 세지 않고 인코딩된 글자는 푼다(이름 붙은 경로 params 와 같게). 잘못된 인코딩이면 받은 글자 그대로
 */
export const pathSegment = (request: Request, fromEnd: number) => {
  const segment = new URL(request.url).pathname.replace(/\/+$/, '').split('/').at(-fromEnd) ?? '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};
export const shouldError = (request: Request) => {
  const url = new URL(request.url);
  return (
    url.searchParams.get('mockError') === 'true' || request.headers.get('x-mock-error') === 'true'
  );
};
