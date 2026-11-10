import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlTestProvider } from '@/test/render';
import AppError from './error';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

/** 앱 층 오류 경계((private) 밖). 오류 경계 영어 카드 */
const INTERNAL = 'Cannot read properties of undefined (reading users.password_hash)';

const renderIn = (locale: 'ko' | 'en', retry?: () => void) => {
  const error = Object.assign(new Error(INTERNAL), { digest: 'dg-990011' });
  return render(<AppError error={error} retry={retry} />, {
    wrapper: ({ children }) => <IntlTestProvider locale={locale}>{children}</IntlTestProvider>,
  });
};

describe('앱 층 오류 경계(src/app/error.tsx)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    push.mockReset();
  });

  it('한국어: 제목, 안내, 오류 ID, 버튼 이름이 예전 글자 그대로', async () => {
    const retry = vi.fn();
    renderIn('ko', retry);
    expect(screen.getByRole('heading', { name: '예기치 않은 오류가 발생했습니다' })).toBeVisible();
    expect(screen.getByText('알 수 없는 오류가 발생했습니다.')).toBeVisible();
    expect(screen.getByText('오류 ID dg-990011')).toBeVisible();
    expect(screen.getByRole('button', { name: '오류 내용 복사' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: '홈으로' }));
    expect(push).toHaveBeenCalledWith('/');
  });

  it('영어: 제목, 안내, 오류 ID, 버튼 이름', async () => {
    const retry = vi.fn();
    const { container } = renderIn('en', retry);
    expect(screen.getByRole('heading', { name: 'An unexpected error occurred' })).toBeVisible();
    expect(screen.getByText('An unknown error occurred.')).toBeVisible();
    expect(screen.getByText('Error ID dg-990011')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy error details' })).toBeVisible();
    expect(container).not.toHaveTextContent(/[가-힣]/);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Go home' }));
    expect(push).toHaveBeenCalledWith('/');
  });

  it('내부 오류 문구는 화면에 보이지 않고 콘솔(오류 보고)에만 남는다', () => {
    const { container } = renderIn('ko');
    expect(container).not.toHaveTextContent(INTERNAL);
    expect(console.error).toHaveBeenCalledWith(
      '[AppError]',
      expect.objectContaining({ message: INTERNAL }),
    );
  });

  it('복사 내용에도 내부 문구 없이 오류 ID 만 담는다(운영 기준)', async () => {
    const user = userEvent.setup();
    renderIn('en');
    await user.click(screen.getByRole('button', { name: 'Copy error details' }));
    expect(await screen.findByText('Copied')).toBeVisible();
    await expect(navigator.clipboard.readText()).resolves.toBe('Error ID dg-990011');
  });

  // 리뷰 반영: 개발 모드는 원인 문구와 stack 을 둘 다 보인다. 개발자 자기 화면이라 원인을 바로 봐야 해서다
  it('개발 모드, V8 stack(첫 줄에 message): stack 하나만 보이고 복사한다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const user = userEvent.setup();
    const error = new Error('목록 계산 중 깨짐');
    error.stack = 'Error: 목록 계산 중 깨짐\n    at Table (table.tsx:10:5)';
    render(<AppError error={error} />, { wrapper: IntlTestProvider });
    expect(screen.getByText(/at Table \(table\.tsx:10:5\)/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '오류 내용 복사' }));
    await expect(navigator.clipboard.readText()).resolves.toBe(error.stack);
  });

  it('개발 모드, Safari 와 Firefox stack(message 없음): message 와 stack 을 둘 다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const user = userEvent.setup();
    const error = new Error('목록 계산 중 깨짐');
    error.stack = 'Table@http://localhost:3000/table.js:10:5';
    const { container } = render(<AppError error={error} />, { wrapper: IntlTestProvider });
    expect(container).toHaveTextContent('목록 계산 중 깨짐');
    expect(container).toHaveTextContent('Table@http://localhost:3000/table.js:10:5');
    await user.click(screen.getByRole('button', { name: '오류 내용 복사' }));
    await expect(navigator.clipboard.readText()).resolves.toBe(
      '목록 계산 중 깨짐\nTable@http://localhost:3000/table.js:10:5',
    );
  });

  it('retry 가 없으면 다시 시도는 홈으로 보낸다', async () => {
    renderIn('ko');
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(push).toHaveBeenCalledWith('/');
  });
});
