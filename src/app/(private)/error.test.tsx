import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlTestProvider } from '@/test/render';
import PrivateError from './error';

/** 화면 단위 경계(옵저버빌리티 1). 헤더와 메뉴는 레이아웃에 남고 본문만 오류로 바뀐다 */
describe('(private) 오류 경계', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('문구, digest, 다시 시도. 운영 기준으로 stack 은 보이지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const retry = vi.fn();
    const error = Object.assign(new Error('목록 계산 중 깨짐'), { digest: 'dg-778899' });
    render(<PrivateError error={error} retry={retry} />, { wrapper: IntlTestProvider });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('화면을 그리는 중 오류가 발생했습니다');
    expect(alert).toHaveTextContent('dg-778899');
    expect(alert).not.toHaveTextContent('at ');
    expect(alert).not.toHaveTextContent('목록 계산 중 깨짐');
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  // 오류 경계 영어 카드: 한국어 글자는 예전과 같다
  it('한국어 안내 줄과 오류 ID 글자가 예전과 같다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('깨짐'), { digest: 'dg-778899' });
    render(<PrivateError error={error} retry={() => {}} />, { wrapper: IntlTestProvider });
    expect(screen.getByRole('alert')).toHaveTextContent(
      '화면을 그리는 중 오류가 발생했습니다.다시 시도하거나 다른 메뉴로 이동하세요.오류 ID dg-778899',
    );
  });

  it('오류 보고: 원래 error 객체를 console.error 로 넘긴다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('보고할 원문');
    render(<PrivateError error={error} retry={() => {}} />, { wrapper: IntlTestProvider });
    expect(console.error).toHaveBeenCalledWith('[PrivateError]', error);
  });

  it('개발 모드에서만 stack 을 보인다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
    const error = new Error('깨짐');
    error.stack = 'Error: 깨짐\n    at Table (table.tsx:10:5)';
    render(<PrivateError error={error} retry={() => {}} />, { wrapper: IntlTestProvider });
    expect(screen.getByRole('alert')).toHaveTextContent('at Table (table.tsx:10:5)');
  });

  it('개발 모드, Safari 와 Firefox stack(message 없음): 원인 문구도 보인다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
    const error = new Error('목록 계산 중 깨짐');
    error.stack = 'Table@http://localhost:3000/table.js:10:5';
    render(<PrivateError error={error} retry={() => {}} />, { wrapper: IntlTestProvider });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('목록 계산 중 깨짐');
    expect(alert).toHaveTextContent('Table@http://localhost:3000/table.js:10:5');
  });

  it('영어 화면에서는 영어 문구, 오류 ID, 다시 시도', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const retry = vi.fn();
    const error = Object.assign(new Error('list broke'), { digest: 'dg-778899' });
    render(<PrivateError error={error} retry={retry} />, {
      wrapper: ({ children }) => <IntlTestProvider locale="en">{children}</IntlTestProvider>,
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong while showing this screen.');
    expect(alert).toHaveTextContent('Try again or go to another menu.');
    expect(alert).toHaveTextContent('Error ID dg-778899');
    expect(alert).not.toHaveTextContent(/[가-힣]/);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
