import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlTestProvider } from '@/test/render';
import NotFound from './not-found';

/** 없는 주소의 화면(죽은 코드 정리 카드 리뷰 진1). 지운 /alarm 같은 주소가 여기로 온다 */
const renderIn = (locale: 'ko' | 'en') =>
  render(<NotFound />, {
    wrapper: ({ children }) => <IntlTestProvider locale={locale}>{children}</IntlTestProvider>,
  });

describe('없는 주소 화면(src/app/not-found.tsx)', () => {
  it('한국어: 제목, 한 줄 설명, 대시보드로 가는 링크', () => {
    renderIn('ko');
    expect(
      screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없어요' }),
    ).toBeVisible();
    expect(
      screen.getByText('주소가 바뀌었거나 없어진 화면입니다. 대시보드에서 다시 찾아 주세요.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: '대시보드로 가기' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('영어: 같은 자리의 글자가 영어이고 한국어가 섞이지 않는다', () => {
    renderIn('en');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    expect(
      screen.getByText(
        'The address may have changed or the page was removed. Start again from the dashboard.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.queryByText(/[가-힣]/)).not.toBeInTheDocument();
  });
});
