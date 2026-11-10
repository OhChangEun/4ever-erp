import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import userEvent from '@testing-library/user-event';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';
import GlobalError from './global-error';

/**
 * 루트 오류 경계(오류 경계 영어 카드). 루트 레이아웃 대신 그려져 언어 provider 가 없다.
 * 언어는 쿠키(NEXT_LOCALE)를 직접 읽어 고른다.
 */
const setLocaleCookie = (value: string) => {
  document.cookie = `NEXT_LOCALE=${value}; path=/`;
};

describe('루트 오류 경계(global-error)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
    vi.restoreAllMocks();
  });

  it('쿠키가 없으면 한국어 문구, 오류 ID, 다시 시도', async () => {
    const retry = vi.fn();
    const error = Object.assign(new Error('레이아웃 깨짐'), { digest: 'dg-112233' });
    render(<GlobalError error={error} retry={retry} />);
    const alert = screen.getByRole('alert');
    expect(screen.getByRole('heading', { name: '예기치 않은 오류가 발생했습니다' })).toBeVisible();
    expect(alert).toHaveTextContent('잠시 후 다시 시도해 주세요. 오류 ID dg-112233');
    expect(document.documentElement).toHaveAttribute('lang', 'ko');
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('쿠키가 en 이면 영어 문구, 오류 ID, 다시 시도', async () => {
    setLocaleCookie('en');
    const retry = vi.fn();
    const error = Object.assign(new Error('layout broke'), { digest: 'dg-445566' });
    render(<GlobalError error={error} retry={retry} />);
    const alert = screen.getByRole('alert');
    expect(screen.getByRole('heading', { name: 'An unexpected error occurred' })).toBeVisible();
    expect(alert).toHaveTextContent('Please try again in a moment. Error ID dg-445566');
    expect(alert).not.toHaveTextContent(/[가-힣]/);
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  // 리뷰 반영: 파일 안 글자 표가 공통 메시지와 어긋나지 않는지(메시지 파일은 테스트에서만 읽는다)
  it.each([
    ['ko', ko],
    ['en', en],
  ])('%s: 제목, 오류 ID, 버튼 이름이 공통 메시지 errorBoundary 와 같다', (locale, messages) => {
    setLocaleCookie(locale);
    const error = Object.assign(new Error('x'), { digest: 'dg-1' });
    render(<GlobalError error={error} retry={() => {}} />);
    expect(screen.getByRole('heading', { name: messages.errorBoundary.title })).toBeVisible();
    expect(screen.getByRole('button', { name: messages.errorBoundary.retry })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      messages.errorBoundary.errorId.replace('{digest}', 'dg-1'),
    );
  });

  it('오류 보고: 원래 error 객체를 console.error 로 넘긴다', () => {
    const error = new Error('보고할 원문');
    render(<GlobalError error={error} retry={() => {}} />);
    expect(console.error).toHaveBeenCalledWith('[GlobalError]', error);
  });

  // 서버에서 그려질 때는 쿠키를 읽지 않고 한국어다. 브라우저 첫 그림(하이드레이션)도 이 값을 써서 어긋나지 않는다
  it('서버 HTML 은 쿠키가 en 이어도 한국어이고 lang="ko"', () => {
    setLocaleCookie('en');
    const html = renderToString(<GlobalError error={new Error('x')} retry={() => {}} />);
    expect(html).toContain('lang="ko"');
    expect(html).toContain('예기치 않은 오류가 발생했습니다');
    expect(html).not.toContain('An unexpected error occurred');
  });

  it('쿠키 값이 지원 언어가 아니면 한국어', () => {
    setLocaleCookie('fr');
    render(<GlobalError error={new Error('x')} retry={() => {}} />);
    expect(screen.getByRole('heading', { name: '예기치 않은 오류가 발생했습니다' })).toBeVisible();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });
});
