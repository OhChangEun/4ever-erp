import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/i18n/messages/en.json';
import ko from '@/i18n/messages/ko.json';
import { useAuthStore } from '@/store/authStore';
import { buildMockUser } from '@/lib/auth/simpleLogin';
import type { Locale } from '@/i18n/locale';
import LoginPage from './page';
import UnauthorizedPage from '../unauthorized/page';
import CallbackPage from '../callback/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/login',
}));

/** 공개 화면은 루트 레이아웃의 공통 메시지만 받는다 */
const renderWith = (ui: ReactElement, locale: Locale) =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'en' ? en : ko}
      timeZone="Asia/Seoul"
    >
      {ui}
    </NextIntlClientProvider>,
  );

// 카드의 메뉴 구분자(화면 코드와 같은 글자). 코드 점 대신 이스케이프로 적는다
const menus = (...names: string[]) => names.join(' \u00B7 ');

describe('로그인 화면 영어(i18n 11)', () => {
  afterEach(() => useAuthStore.getState().clearUserInfo());

  it('제목, 역할 카드 이름과 메뉴, 입력칸, 버튼이 영어다', () => {
    renderWith(<LoginPage />, 'en');

    expect(screen.getByRole('heading', { name: '4Ever Quick sign-in' })).toBeInTheDocument();
    const admin = screen.getByRole('button', { name: /Super admin/ });
    expect(admin).toHaveTextContent(
      menus('Dashboard', 'Sales', 'Production', 'Purchasing', 'Inventory', 'Finance', 'HR'),
    );
    expect(screen.getByRole('button', { name: /Supplier admin/ })).toHaveTextContent(
      menus('Sales', 'Finance'),
    );
    expect(screen.getByPlaceholderText('Enter ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('입력 오류도 영어다', async () => {
    const user = userEvent.setup();
    renderWith(<LoginPage />, 'en');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Please enter an ID.')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'NOBODY');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Pick an ID from the list or enter a valid one.')).toBeInTheDocument();
  });

  // 남은 한국어 문자열 카드: 로그인 라우트의 오류 message 는 한국어 고정이라 화면은 상태 코드로 자기 문구를 고른다
  it.each([
    [401, '없는 아이디입니다.', 'Pick an ID from the list or enter a valid one.'],
    [403, '잘못된 요청 출처', 'Sign-in failed.'],
    [404, '데모 로그인이 꺼져 있습니다.', 'Sign-in failed.'],
  ])(
    '로그인 라우트가 %i 이면 서버 message 대신 영어 문구를 보인다',
    async (status, message, shown) => {
      server.use(http.post('/api/auth/login', () => HttpResponse.json({ message }, { status })));
      const user = userEvent.setup();
      renderWith(<LoginPage />, 'en');

      await user.type(screen.getByRole('textbox'), 'admin');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(await screen.findByText(shown)).toBeInTheDocument();
      expect(screen.queryByText(message)).not.toBeInTheDocument();
    },
  );

  it('한국어는 예전 문구 그대로(e2e 가 /로그인/ 버튼으로 들어온다)', async () => {
    const user = userEvent.setup();
    renderWith(<LoginPage />, 'ko');

    expect(screen.getByRole('heading', { name: '4Ever 간편 로그인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /전체 관리자/ })).toHaveTextContent(
      menus('대시보드', '영업', '생산', '구매', '재고', '재무', '인사'),
    );
    expect(screen.getByRole('button', { name: /고객사 관리자/ })).toHaveTextContent(
      menus('대시보드', '구매관리', '재무'),
    );
    expect(screen.getByPlaceholderText('아이디 입력')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByText('아이디를 입력해 주세요.')).toBeInTheDocument();
  });

  it('세션에 넣는 이름은 번역하지 않는다(서버 값)', () => {
    expect(buildMockUser('mm_admin').name).toBe('구매 관리자');
  });
});

describe('권한 없음, 이동 화면 영어(i18n 11)', () => {
  it('권한 없음 화면', () => {
    renderWith(<UnauthorizedPage />, 'en');
    expect(screen.getByRole('heading', { name: 'Access required' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to home' })).toBeInTheDocument();
  });

  it('로그인 이동 화면', () => {
    renderWith(<CallbackPage />, 'en');
    expect(screen.getByRole('heading', { name: 'Taking you to sign-in' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/refresh the page/);
  });

  it('한국어는 예전 문구 그대로', () => {
    renderWith(<UnauthorizedPage />, 'ko');
    expect(
      screen.getByText(
        '요청하신 페이지를 열 수 있는 권한이 없습니다. 권한이 있어야 하는 경우 관리자에게 요청하거나, 올바른 역할로 로그인했는지 확인하세요.',
      ),
    ).toBeInTheDocument();
  });
});
