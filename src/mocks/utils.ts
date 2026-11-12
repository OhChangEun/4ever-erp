import { HttpResponse } from 'msw';

export const now = new Date();
export const isoNow = now.toISOString();

/** 기간별 추이 길이(시각화 1). 주는 일, 월과 분기는 주, 연은 월 */
export const TREND_LENGTH = { week: 7, month: 5, quarter: 13, year: 12 } as const;

type Period = keyof typeof TREND_LENGTH;
/** 지표의 기간별 값 */
export type Metric = Record<Period, number>;

/** 글자로 정해지는 0 이상 1 미만의 수. 같은 글자는 늘 같은 값이다(난수 대신) */
export const hashUnit = (text: string) => {
  let seed = [...text].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 2147483647, 7);
  seed = (seed * 48271) % 2147483647;
  return (seed % 10000) / 10000;
};

/**
 * 기간마다 쌓이는 지표(건수, 금액). 값은 주 값이다. 화면의 기본 기간이 주이고 목록은 기간으로 거르지 않아서
 * 건수 지표의 주 값을 목록 총 건수와 같게 둔다(카드 "목 데이터 현실성" 결정 1)
 */
export const flow = (week: number): Metric => ({
  week,
  month: week * 4,
  quarter: week * 13,
  year: week * 52,
});
/** 지금 값인 지표(직원 수, 창고 수, 재고 금액). 기간마다 같다 */
export const level = (value: number): Metric => ({
  week: value,
  month: value,
  quarter: value,
  year: value,
});

/**
 * 지표 하나. 추이의 마지막 점이 값이고, 첫 점 대비 증감이 delta_rate(비율, 0.12 = 12%. 계약 Stat 설명)다.
 * 이름과 기간으로 -15%~+25% 를 고르고 첫 점을 값 / (1 + 비율) 로 둔 뒤, 반올림한 첫 점에서 비율을 다시 계산한다.
 * 사이의 점은 첫 점에서 마지막 점으로 가며 ±5% 흔든다
 */
export const periodStat = (period: Period, name: string, value: number) => {
  const key = `${period}:${name}`;
  const length = TREND_LENGTH[period];
  const first = Math.round(value / (1 + (hashUnit(key) * 0.4 - 0.15)));
  const delta_rate = first === 0 ? 0 : Math.round(((value - first) / first) * 1000) / 1000;
  const middle = Array.from({ length: length - 2 }, (_, i) => {
    const base = first + ((value - first) * (i + 1)) / (length - 1);
    return Math.round(base * (1 + (hashUnit(`${key}:${i}`) - 0.5) * 0.1));
  });
  return { value, delta_rate, trend: [first, ...middle, value] };
};

/** `{ 지표: 기간별 값 }` 을 받아 네 기간의 통계 응답을 만든다 */
export const statResponse = (data: Record<string, Metric>) => {
  const at = (period: Period) =>
    Object.fromEntries(
      Object.entries(data).map(([name, metric]) => [
        name,
        periodStat(period, name, metric[period]),
      ]),
    );
  return { week: at('week'), month: at('month'), quarter: at('quarter'), year: at('year') };
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
