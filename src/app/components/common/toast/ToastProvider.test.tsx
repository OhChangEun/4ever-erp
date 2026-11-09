import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function Trigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.success('저장했습니다.', 1000)}>
      알림
    </button>
  );
}

describe('토스트', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const show = () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    void act(() => screen.getByRole('button', { name: '알림' }).click());
  };

  it('보이고, 시간이 지나면 사라진다(사라지는 애니메이션 뒤 제거)', () => {
    show();
    expect(screen.getByText('저장했습니다.')).toBeInTheDocument();
    void act(() => vi.advanceTimersByTime(1000));
    // 사라지는 중에는 아직 DOM 에 있다
    expect(screen.getByText('저장했습니다.')).toBeInTheDocument();
    void act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument();
  });

  it('닫기 버튼으로 바로 닫는다(이름이 있는 버튼)', () => {
    show();
    void act(() => screen.getByRole('button', { name: '알림 닫기' }).click());
    void act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument();
  });

  it('스크린리더가 읽도록 알림 영역(status)에 있다', () => {
    show();
    expect(screen.getByRole('status')).toHaveTextContent('저장했습니다.');
  });
});
