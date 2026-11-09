import axios from 'axios';

/**
 * API 호출 실패를 한 모양으로 정규화한 오류.
 * 결정 기록: ai/decisions.md 2026-11-09 "AppError 모양".
 * 화면은 `kind` 로 분기하고, 문구는 `ERROR_MESSAGE_BY_KIND` 한 곳에서 고친다.
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

  constructor(
    kind: ErrorKind,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.kind = kind;
    this.status = options.status;
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

export const ERROR_MESSAGE_BY_KIND: Record<ErrorKind, string> = {
  network: '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.',
  timeout: '서버 응답이 늦습니다. 잠시 후 다시 시도해 주세요.',
  unauthorized: '로그인이 필요합니다.',
  forbidden: '이 데이터를 볼 권한이 없습니다.',
  notFound: '요청한 데이터를 찾을 수 없습니다.',
  conflict: '다른 사용자가 먼저 수정했습니다. 다시 불러와 주세요.',
  badRequest: '입력값이 올바르지 않습니다. 내용을 확인해 주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  invalidShape: '서버 응답 형식이 예상과 다릅니다. 관리자에게 문의해 주세요.',
};

const UNKNOWN_MESSAGE = '알 수 없는 오류가 발생했습니다.';

/** 화면에 보여줄 한 줄. AppError 가 아니면 공통 문구. */
export const errorMessageOf = (error: unknown): string =>
  isAppError(error) ? ERROR_MESSAGE_BY_KIND[error.kind] : UNKNOWN_MESSAGE;

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

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new AppError('timeout', message, { cause: error });
    }
    if (status === undefined) {
      return new AppError('network', message, { cause: error });
    }
    return new AppError(kindOfStatus(status), message, { status, cause: error });
  }

  const message = error instanceof Error ? error.message : String(error);
  return new AppError('server', message, { cause: error });
};
