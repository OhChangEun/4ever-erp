import { HttpResponse } from 'msw';

export const now = new Date();
export const isoNow = now.toISOString();

export const stat = { value: 1200, delta_rate: 0.12 };
export const statResponse = <T>(data: T) => ({
  week: data,
  month: data,
  quarter: data,
  year: data,
});

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
export const shouldError = (request: Request) => {
  const url = new URL(request.url);
  return (
    url.searchParams.get('mockError') === 'true' || request.headers.get('x-mock-error') === 'true'
  );
};
