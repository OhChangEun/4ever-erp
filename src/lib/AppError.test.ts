import { describe, expect, it } from 'vitest';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { AppError, isAppError, toAppError } from './AppError';

const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };

const httpError = (
  status: number,
  body: unknown = { success: false, message: `서버 메시지 ${status}` },
) =>
  new AxiosError(
    'Request failed',
    'ERR_BAD_RESPONSE',
    config,
    {},
    {
      status,
      statusText: '',
      headers: {},
      config,
      data: body,
    },
  );

describe('toAppError', () => {
  it('연결 끊김(ERR_NETWORK) → network', () => {
    const e = toAppError(new AxiosError('Network Error', 'ERR_NETWORK', config));
    expect(e.kind).toBe('network');
    expect(e.status).toBeUndefined();
  });

  it('타임아웃(ECONNABORTED, ETIMEDOUT) → timeout', () => {
    expect(
      toAppError(new AxiosError('timeout of 4000ms exceeded', 'ECONNABORTED', config)).kind,
    ).toBe('timeout');
    expect(toAppError(new AxiosError('timeout', 'ETIMEDOUT', config)).kind).toBe('timeout');
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [400, 'badRequest'],
    [422, 'badRequest'],
    [500, 'server'],
    [503, 'server'],
  ])('HTTP %i → %s, status 와 서버 message 보존', (status, kind) => {
    const e = toAppError(httpError(status));
    expect(e.kind).toBe(kind);
    expect(e.status).toBe(status);
    expect(e.message).toBe(`서버 메시지 ${status}`);
  });

  it('서버 message 가 없으면 axios message 를 쓴다', () => {
    const e = toAppError(httpError(500, 'not json'));
    expect(e.message).toBe('Request failed');
  });

  it('이미 AppError 면 그대로 돌려준다', () => {
    const original = new AppError('invalidShape', '형식');
    expect(toAppError(original)).toBe(original);
  });

  it('axios 오류가 아니면 server 로 감싸고 cause 를 남긴다', () => {
    const cause = new TypeError('boom');
    const e = toAppError(cause);
    expect(e.kind).toBe('server');
    expect(e.cause).toBe(cause);
  });
});

describe('isAppError', () => {
  it('AppError 는 Error 의 인스턴스이고 가드를 통과한다', () => {
    const e = new AppError('notFound', '없음', { status: 404 });
    expect(e).toBeInstanceOf(Error);
    expect(isAppError(e)).toBe(true);
    expect(isAppError(new Error('x'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});

describe('요청 ID(옵저버빌리티 1)', () => {
  it('응답 헤더의 x-request-id 를 담는다', () => {
    const response: AxiosResponse = {
      status: 500,
      statusText: 'err',
      headers: { 'x-request-id': 'req-12345678-abcd' },
      config,
      data: { success: false, message: 'boom' },
    };
    const error = new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, response);
    expect(toAppError(error).requestId).toBe('req-12345678-abcd');
  });

  it('응답이 없으면 요청 ID 도 없다', () => {
    expect(toAppError(new AxiosError('down', 'ERR_NETWORK')).requestId).toBeUndefined();
  });
});
