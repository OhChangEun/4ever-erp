import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/i18n/messages/en.json';
import ko from '@/i18n/messages/ko.json';
import { server } from '@/test/msw-server';
import { useAuthStore } from '@/store/authStore';
import { buildMockUser } from '@/lib/auth/simpleLogin';
import type { Locale } from '@/i18n/locale';
import LoginPage from './page';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/login',
}));

const renderLogin = (locale: Locale = 'ko') =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'en' ? en : ko}
      timeZone="Asia/Seoul"
    >
      <LoginPage />
    </NextIntlClientProvider>,
  );

/** 로그인 라우트 자리. 받은 아이디를 기록하고 서버처럼 데모 사용자를 돌려준다 */
const recordLogin = () => {
  const seen: unknown[] = [];
  server.use(
    http.post('/api/auth/login', async ({ request }) => {
      const body: unknown = await request.json();
      const loginId =
        typeof body === 'object' && body !== null && 'loginId' in body ? body.loginId : undefined;
      seen.push(loginId);
      return HttpResponse.json({ user: buildMockUser(typeof loginId === 'string' ? loginId : '') });
    }),
  );
  return seen;
};

const typeAndSubmit = async (loginId: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox'), loginId);
  await user.click(screen.getByRole('button', { name: '로그인' }));
};

const menus = (...names: string[]) => names.join(' · ');

// 카드 "로그인 아이디와 생산 데모 계정"
describe('데모 로그인 아이디 입력', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
    replace.mockClear();
  });

  it.each(['mm_admin', 'Mm_Admin', '  MM_ADMIN  '])(
    '"%s" 로 쳐도 로그인 요청이 나가고 구매 관리자로 들어간다',
    async (loginId) => {
      const seen = recordLogin();
      renderLogin();

      await typeAndSubmit(loginId);

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
      expect(seen).toHaveLength(1);
      expect(String(seen[0]).trim().toLowerCase()).toBe('mm_admin');
      expect(useAuthStore.getState().userInfo?.role).toBe('MM_ADMIN');
      expect(
        screen.queryByText('목록의 아이디를 선택하거나 올바른 아이디를 입력해 주세요.'),
      ).not.toBeInTheDocument();
    },
  );

  it.each(['nobody', 'mm_admin2', 'constructor'])(
    '없는 아이디 "%s" 는 화면에서 막고 요청을 보내지 않는다',
    async (loginId) => {
      const seen = recordLogin();
      renderLogin();

      await typeAndSubmit(loginId);

      expect(
        await screen.findByText('목록의 아이디를 선택하거나 올바른 아이디를 입력해 주세요.'),
      ).toBeInTheDocument();
      expect(seen).toHaveLength(0);
      expect(replace).not.toHaveBeenCalled();
      // 입력은 그대로 남는다
      expect(screen.getByRole('textbox')).toHaveValue(loginId);
    },
  );

  it('pp_admin 으로 로그인하면 역할이 PP_ADMIN 이다', async () => {
    const seen = recordLogin();
    renderLogin();

    await typeAndSubmit('pp_admin');

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(seen).toHaveLength(1);
    expect(useAuthStore.getState().userInfo).toMatchObject({
      name: '생산 관리자',
      role: 'PP_ADMIN',
    });
  });
});

describe('로그인 화면의 생산 관리자 카드', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
    replace.mockClear();
  });

  it('카드에 이름, 역할, PP 가 갈 수 있는 메뉴가 보인다', () => {
    renderLogin();
    const card = screen.getByRole('button', { name: /생산 관리자/ });
    expect(card).toHaveTextContent('PP_ADMIN');
    expect(card).toHaveTextContent(menus('대시보드', '영업', '생산', '구매', '재고'));
    expect(card).not.toHaveTextContent('재무');
    expect(card).not.toHaveTextContent('인사');
  });

  it('영어 화면에서는 Production manager', () => {
    renderLogin('en');
    expect(screen.getByRole('button', { name: /Production manager/ })).toHaveTextContent(
      menus('Dashboard', 'Sales', 'Production', 'Purchasing', 'Inventory'),
    );
  });

  it('카드를 누르고 로그인하면 PP_ADMIN 으로 들어간다', async () => {
    const seen = recordLogin();
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /생산 관리자/ }));
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(seen).toHaveLength(1);
    expect(useAuthStore.getState().userInfo?.role).toBe('PP_ADMIN');
  });
});
