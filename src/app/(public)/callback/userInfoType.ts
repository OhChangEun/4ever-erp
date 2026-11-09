export interface userInfoResponse {
  id: number;
  name: string;
  email: string;
  role: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * `/api/auth/me`, `/api/auth/login` 응답 `{ user }` 를 `as` 없이 읽는다.
 * 모양이 틀리면 null. 호출하는 쪽이 로그인 실패로 다룬다(틀린 사용자로 화면을 열지 않는다).
 */
export const readUserResponse = (body: unknown): userInfoResponse | null => {
  if (!isRecord(body) || !isRecord(body.user)) return null;
  const { id, name, email, role } = body.user;
  if (
    typeof id !== 'number' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof role !== 'string'
  ) {
    return null;
  }
  return { id, name, email, role };
};

/** 오류 응답 본문의 message. 글자가 아니면 undefined */
export const readErrorMessage = (body: unknown): string | undefined =>
  isRecord(body) && typeof body.message === 'string' ? body.message : undefined;
