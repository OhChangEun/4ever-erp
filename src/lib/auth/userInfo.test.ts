import { describe, expect, it } from 'vitest';
import { readErrorMessage, readUserResponse } from './userInfo';

describe('인증 응답 읽기', () => {
  const user = { id: 1, name: '관리자', email: 'a@b.c', role: 'ALL_ADMIN' };

  it('{ user } 모양이면 사용자를 돌려준다', () => {
    expect(readUserResponse({ user })).toEqual(user);
  });

  it('모양이 틀리면 null', () => {
    expect(readUserResponse(null)).toBeNull();
    expect(readUserResponse({})).toBeNull();
    expect(readUserResponse({ user: { ...user, role: 1 } })).toBeNull();
  });

  it('오류 본문의 message 가 글자일 때만 꺼낸다', () => {
    expect(readErrorMessage({ message: '없는 계정' })).toBe('없는 계정');
    expect(readErrorMessage({ message: 3 })).toBeUndefined();
    expect(readErrorMessage(null)).toBeUndefined();
  });
});
