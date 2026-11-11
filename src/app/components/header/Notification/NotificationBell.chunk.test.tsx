import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { resetAlarmMock } from '@/mocks/handlers/alarm.handlers';
import NotificationBell from './NotificationBell';

/**
 * 알림 UI 연결 카드 리뷰(C 2번): 목록 팝오버 청크를 못 받았을 때(오프라인, 배포 직후 옛 청크).
 * 실패 문구가 팝오버 자리에 보이고, 닫기(Esc, 바깥 누름, 포커스 복귀)는 그대로 돼야 한다.
 */
// 팝오버 내용 모듈의 import() 가 실패한다
vi.mock('./NotificationDropdown', () => {
  throw new Error('chunk load failed');
});

describe('알림 팝오버 청크를 못 받았을 때', () => {
  beforeEach(() => {
    // 오류 경계가 console.error 로 남기는 로그는 이 테스트가 일부러 낸 것
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    resetAlarmMock();
    vi.restoreAllMocks();
  });

  it('팝오버 자리에 실패 문구가 보이고 Esc 로 닫히며 포커스가 버튼으로 돌아온다', async () => {
    renderWithProviders(<NotificationBell isExpanded />);
    const button = await screen.findByRole('button', { name: '알림, 안 읽은 알림 3개' });
    await userEvent.click(button);

    const dialog = await screen.findByRole('dialog', { name: '알림' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '알림을 불러오지 못했습니다.',
    );
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('알림을 불러오지 못했습니다.')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(button).toHaveFocus());
  });

  it('바깥을 눌러도 닫힌다', async () => {
    renderWithProviders(
      <>
        <NotificationBell isExpanded />
        <p>본문</p>
      </>,
    );
    await userEvent.click(await screen.findByRole('button', { name: '알림, 안 읽은 알림 3개' }));
    await screen.findByText('알림을 불러오지 못했습니다.');
    await userEvent.click(screen.getByText('본문'));
    expect(screen.queryByText('알림을 불러오지 못했습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '알림, 안 읽은 알림 3개' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
