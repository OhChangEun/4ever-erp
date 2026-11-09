import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrivateError from './error';

/** 화면 단위 경계(옵저버빌리티 1). 헤더와 메뉴는 레이아웃에 남고 본문만 오류로 바뀐다 */
describe('(private) 오류 경계', () => {
  it('문구, digest, 다시 시도. 운영 기준으로 stack 은 보이지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const retry = vi.fn();
    const error = Object.assign(new Error('목록 계산 중 깨짐'), { digest: 'dg-778899' });
    render(<PrivateError error={error} retry={retry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('화면을 그리는 중 오류가 발생했습니다');
    expect(alert).toHaveTextContent('dg-778899');
    expect(alert).not.toHaveTextContent('at ');
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
