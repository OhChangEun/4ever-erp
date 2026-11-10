import { describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import en from '@/i18n/messages/en.json';
import ko from '@/i18n/messages/ko.json';
import { createTestQueryClient } from '@/test/render';
import { ModalProvider } from '@/app/components/common/modal/ModalProvider';
import { ToastProvider } from '@/app/components/common/toast/ToastProvider';
import type { Locale } from '@/i18n/locale';
import ProfileLayout from './layout';
import ProfilePage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/profile',
}));

// 앱 Providers 는 MSW 켜기와 개발 도구까지 들고 있어 테스트와 같은 것만 남긴다
vi.mock('@/app/providers', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <ModalProvider>{children}</ModalProvider>
      </ToastProvider>
    </QueryClientProvider>
  ),
}));

// 사이드바 대신 공통 'profile' 메시지(프로필 메뉴)를 읽는 탐침. 화면 메시지가 공통 것을 덮지 않는지 본다
vi.mock('@/app/components/sidebar/Sidebar', () => ({
  default: function SidebarProbe() {
    const t = useTranslations('profile');
    return <nav aria-label="sidebar">{t('profile')}</nav>;
  },
}));

/** 루트 레이아웃처럼 공통 메시지만 준다. 화면 메시지는 프로필 레이아웃이 붙여야 한다 */
const renderUnderRoot = (locale: Locale) =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'en' ? en : ko}
      timeZone="Asia/Seoul"
    >
      <ProfileLayout>
        <ProfilePage />
      </ProfileLayout>
    </NextIntlClientProvider>,
  );

describe('내 프로필 화면 영어(i18n 11)', () => {
  it('제목, 근무 정보, 근태, 교육 문구가 영어다', async () => {
    renderUnderRoot('en');

    // 영어 메시지는 고를 때 받는다(동적 import)
    expect(await screen.findByRole('heading', { name: 'My profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
    expect(screen.getByText('Years of service')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Attendance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "Today's attendance" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In progress' })).toBeInTheDocument();
    // 목 응답의 교육 시간 3 → 복수형
    expect(await screen.findByText(/3 hours/)).toBeInTheDocument();
    // 공통 프로필 메뉴 글자는 그대로 남는다
    expect(screen.getByRole('navigation', { name: 'sidebar' })).toHaveTextContent(
      'Profile settings',
    );
  });

  it('편집 폼과 휴가 신청 창도 영어다', async () => {
    const user = userEvent.setup();
    renderUnderRoot('en');

    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel editing' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Request leave' }));
    expect(screen.getByRole('heading', { name: 'Request leave' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Annual leave' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('한국어는 예전 문구 그대로', async () => {
    renderUnderRoot('ko');

    expect(screen.getByRole('heading', { name: '내 프로필' })).toBeInTheDocument();
    expect(screen.getByText('개인 정보 및 근무 현황')).toBeInTheDocument();
    expect(screen.getByText('근속기간')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수강중인 교육' })).toBeInTheDocument();
    expect(await screen.findByText(/\| 3시간/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'sidebar' })).toHaveTextContent('프로필 설정');
  });
});
