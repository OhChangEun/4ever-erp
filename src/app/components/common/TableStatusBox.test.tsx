import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlTestProvider } from '@/test/render';
import TableStatusBox from './TableStatusBox';
import { AppError } from '@/lib/AppError';

describe('TableStatusBox', () => {
  it('error 에 AppError 를 주면 화면 문구 아래에 kind 문구를 덧붙인다', () => {
    render(
      <TableStatusBox
        type="error"
        message="발주서 목록을 불러오는 중 오류가 발생했습니다."
        error={new AppError('forbidden', '권한 없음', { status: 403 })}
      />,
      { wrapper: IntlTestProvider },
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('발주서 목록을 불러오는 중 오류가 발생했습니다.');
    expect(alert).toHaveTextContent('이 데이터를 볼 권한이 없습니다.');
  });

  it('error 가 없으면 기존처럼 화면 문구만 보인다', () => {
    render(<TableStatusBox type="error" message="오류" />, { wrapper: IntlTestProvider });
    expect(screen.getByRole('alert')).toHaveTextContent(/^오류$/);
  });

  it('loading 은 role=status, empty 는 alert 가 아니다', () => {
    const { rerender } = render(<TableStatusBox type="loading" message="로딩" />, {
      wrapper: IntlTestProvider,
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<TableStatusBox type="empty" message="없음" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('없음')).toBeInTheDocument();
  });

  it('요청 ID 가 있으면 앞 8자를 같이 보인다(옵저버빌리티 1)', () => {
    render(
      <TableStatusBox
        type="error"
        message="오류"
        error={new AppError('server', 'boom', { status: 500, requestId: 'abcdef12-3456-7890' })}
      />,
      { wrapper: IntlTestProvider },
    );
    expect(screen.getByRole('alert')).toHaveTextContent('요청 ID abcdef12');
  });
});
