import { describe, expect, it } from 'vitest';
import { renderHook, screen } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { http, HttpResponse } from 'msw';
import { AppError, toAppError, type ErrorKind } from '@/lib/AppError';
import axios from '@/lib/axiosInstance';
import { server } from '@/test/msw-server';
import { IntlTestProvider, renderWithProviders } from '@/test/render';
import type { Locale } from '@/i18n/locale';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import TableStatusBox from './TableStatusBox';
import StatSection from './StatSection';

const cases: { kind: ErrorKind; en: string; ko: string }[] = [
  {
    kind: 'network',
    en: 'Cannot connect to the server. Please check your network.',
    ko: '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.',
  },
  {
    kind: 'timeout',
    en: 'The server is taking too long to respond. Please try again later.',
    ko: '서버 응답이 늦습니다. 잠시 후 다시 시도해 주세요.',
  },
  { kind: 'unauthorized', en: 'Please log in.', ko: '로그인이 필요합니다.' },
  {
    kind: 'forbidden',
    en: 'You do not have permission to view this data.',
    ko: '이 데이터를 볼 권한이 없습니다.',
  },
  {
    kind: 'notFound',
    en: 'The requested data could not be found.',
    ko: '요청한 데이터를 찾을 수 없습니다.',
  },
  {
    kind: 'conflict',
    en: 'Another user has already made changes. Please reload the data.',
    ko: '다른 사용자가 먼저 수정했습니다. 다시 불러와 주세요.',
  },
  {
    kind: 'badRequest',
    en: 'The input is invalid. Please check the details.',
    ko: '입력값이 올바르지 않습니다. 내용을 확인해 주세요.',
  },
  {
    kind: 'server',
    en: 'A server error occurred. Please try again later.',
    ko: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  },
  {
    kind: 'invalidShape',
    en: 'The server response has an unexpected format. Please contact your administrator.',
    ko: '서버 응답 형식이 예상과 다릅니다. 관리자에게 문의해 주세요.',
  },
];
const locales: Locale[] = ['en', 'ko'];
const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };
const httpError = (status: number, data: unknown) =>
  toAppError(
    new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
      status,
      statusText: '',
      headers: {},
      config,
      data,
    }),
  );

function ErrorSurfaces({ error }: { error: unknown }) {
  return (
    <>
      <TableStatusBox type="error" message="Load failed" error={error} />
      <StatSection statsData={{}} error={error} />
    </>
  );
}

it('kind 별 문구를 돌려주고, AppError 가 아니면 공통 문구', () => {
  const { result } = renderHook(useErrorMessage, { wrapper: IntlTestProvider });
  const errorMessageOf = result.current;
  expect(errorMessageOf(new AppError('timeout', 't'))).toBe(
    '서버 응답이 늦습니다. 잠시 후 다시 시도해 주세요.',
  );
  expect(errorMessageOf(new Error('x'))).toBe('알 수 없는 오류가 발생했습니다.');
});

describe.each(locales)('공통 오류 줄 %s', (locale) => {
  it.each(cases)('$kind: 표와 통계가 화면 언어로 같은 실패를 표시한다', (scenario) => {
    renderWithProviders(<ErrorSurfaces error={new AppError(scenario.kind, '내부 진단 메시지')} />, {
      locale,
    });
    expect(screen.getAllByText(scenario[locale], { exact: true })).toHaveLength(2);
    for (const alert of screen.getAllByRole('alert')) {
      expect(alert).toHaveTextContent(scenario[locale]);
      expect(alert).not.toHaveTextContent('내부 진단 메시지');
    }
  });

  it('분류할 수 없는 오류도 화면 언어를 따르고 내부 메시지를 노출하지 않는다', () => {
    renderWithProviders(<ErrorSurfaces error={new Error('내부 진단 메시지')} />, { locale });
    for (const alert of screen.getAllByRole('alert')) {
      expect(alert).toHaveTextContent(
        locale === 'en' ? 'An unknown error occurred.' : '알 수 없는 오류가 발생했습니다.',
      );
      expect(alert).not.toHaveTextContent('내부 진단 메시지');
    }
  });

  it('요청 ID 표기도 화면 언어를 따르고 앞 8자를 유지한다', () => {
    renderWithProviders(
      <ErrorSurfaces
        error={new AppError('server', 'diagnostic', { requestId: 'abcdefgh-12345678' })}
      />,
      { locale },
    );
    for (const alert of screen.getAllByRole('alert')) {
      expect(alert).toHaveTextContent(`${locale === 'en' ? 'Request ID' : '요청 ID'} abcdefgh`);
      expect(alert).not.toHaveTextContent('12345678');
    }
  });

  it.each([
    {
      status: 409,
      en: 'Another user has already made changes. Please reload the data.',
      ko: '다른 사용자가 먼저 수정했습니다. 다시 불러와 주세요.',
    },
    {
      status: 500,
      en: 'A server error occurred. Please try again later.',
      ko: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    },
  ])('HTTP $status 실패는 종류별 문구만 표시하고 서버 메시지를 덧붙이지 않는다', (scenario) => {
    const message = 'Failed to load attendance list. {orderId} <internal>';
    renderWithProviders(<ErrorSurfaces error={httpError(scenario.status, { message })} />, {
      locale,
    });
    expect(screen.getAllByText(scenario[locale], { exact: true })).toHaveLength(2);
    for (const alert of screen.getAllByRole('alert')) {
      expect(alert).not.toHaveTextContent(message);
    }
  });

  it.each([null, 'not json', {}, { message: 42 }])(
    '서버 메시지를 읽을 수 없는 본문 %j 은 종류별 문구로 표시한다',
    (body) => {
      renderWithProviders(<ErrorSurfaces error={httpError(500, body)} />, { locale });
      for (const alert of screen.getAllByRole('alert')) {
        expect(alert).toHaveTextContent(
          locale === 'en'
            ? 'A server error occurred. Please try again later.'
            : '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        );
        expect(alert).not.toHaveTextContent('Request failed');
      }
    },
  );

  it('2xx 실패 래퍼도 서버 메시지 없이 종류별 문구만 표시한다', async () => {
    const message = '처리할 수 없는 요청입니다. {value}';
    server.use(
      http.get('/api/error-message-test', () => HttpResponse.json({ success: false, message })),
    );
    let failure: unknown;
    try {
      await axios.get('/api/error-message-test');
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(AppError);
    renderWithProviders(<ErrorSurfaces error={failure} />, { locale });
    for (const alert of screen.getAllByRole('alert')) {
      expect(alert).not.toHaveTextContent(message);
      expect(alert).toHaveTextContent(
        locale === 'en'
          ? 'The server response has an unexpected format. Please contact your administrator.'
          : '서버 응답 형식이 예상과 다릅니다. 관리자에게 문의해 주세요.',
      );
    }
  });
});

it('같은 오류를 둔 채 화면 언어를 바꾸면 오류 줄과 요청 ID도 바뀐다', () => {
  const error = new AppError('unauthorized', 'diagnostic', { requestId: 'abcdefgh-12345678' });
  const { rerender } = renderWithProviders(
    <IntlTestProvider locale="ko">
      <ErrorSurfaces error={error} />
    </IntlTestProvider>,
  );
  expect(screen.getAllByRole('alert')[0]).toHaveTextContent('로그인이 필요합니다.');
  rerender(
    <IntlTestProvider locale="en">
      <ErrorSurfaces error={error} />
    </IntlTestProvider>,
  );
  for (const alert of screen.getAllByRole('alert')) {
    expect(alert).toHaveTextContent('Please log in.');
    expect(alert).toHaveTextContent('Request ID abcdefgh');
    expect(alert).not.toHaveTextContent(/[가-힣]/);
  }
});
