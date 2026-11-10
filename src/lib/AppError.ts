import axios from 'axios';

/**
 * API 호출 실패를 한 모양으로 정규화한 오류.
 * 결정 기록: ai/decisions.md 2026-11-09 "AppError 모양".
 * 화면은 `kind` 에 해당하는 안내만 번역해 표시한다.
 */
export type ErrorKind =
  | 'network' // 연결 끊김, DNS 실패. 응답 자체가 없음
  | 'timeout' // axios timeout 초과
  | 'unauthorized' // 401. 화면 전환은 QueryCache onError 카드에서
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'conflict' // 409. 낙관적 락 충돌
  | 'badRequest' // 그 외 4xx (400, 422 등). 입력값 문제
  | 'server' // 5xx, 또는 분류할 수 없는 오류
  | 'invalidShape'; // 2xx 인데 응답 래퍼가 계약과 다름

export class AppError extends Error {
  readonly kind: ErrorKind;
  readonly status: number | undefined;
  /** 프록시가 붙인 x-request-id. 화면 오류와 서버 로그를 잇는다(옵저버빌리티 1) */
  readonly requestId: string | undefined;

  constructor(
    kind: ErrorKind,
    message: string,
    options: { status?: number; cause?: unknown; requestId?: string } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.kind = kind;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const kindOfStatus = (status: number): ErrorKind => {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status >= 400 && status < 500) return 'badRequest';
  return 'server';
};

/** 서버 래퍼 `{ success: false, message }` 의 message 를 꺼낸다. 없으면 undefined. */
const serverMessageOf = (body: unknown): string | undefined =>
  isRecord(body) && typeof body.message === 'string' ? body.message : undefined;

/**
 * axios 오류(또는 아무 값)를 AppError 로 바꾼다. 이미 AppError 면 그대로.
 * 취소(axios.isCancel)는 여기 오기 전에 인터셉터가 걸러서 그대로 넘긴다.
 */
export const toAppError = (error: unknown): AppError => {
  if (isAppError(error)) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = serverMessageOf(error.response?.data) ?? error.message;
    const header: unknown = error.response?.headers['x-request-id'];
    const requestId = typeof header === 'string' ? header : undefined;

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new AppError('timeout', message, { cause: error });
    }
    if (status === undefined) {
      return new AppError('network', message, { cause: error });
    }
    return new AppError(kindOfStatus(status), message, { status, cause: error, requestId });
  }

  const message = error instanceof Error ? error.message : String(error);
  return new AppError('server', message, { cause: error });
};
