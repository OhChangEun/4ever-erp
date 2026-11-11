import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { ok } from '@/mocks/utils';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { HRM_BASE_PATH } from '@/app/(private)/hrm/api/hrm.endpoints';
import LeaveTab from './LeaveTab';

describe('휴가 승인과 반려 확인 창', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** 대기 휴가 한 건(기본 목)의 행 버튼을 누른다. 브라우저 기본 창은 쓰지 않아야 한다 */
  const openFromRow = async (button: string) => {
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderWithProviders(<LeaveTab />);
    await user.click(await screen.findByRole('button', { name: button }, { timeout: 3000 }));
    expect(nativeConfirm).not.toHaveBeenCalled();
    return user;
  };

  it('승인: 앱 모달에서 확인하면 요청이 한 번 나가고 닫힌다', async () => {
    let calls = 0;
    server.use(
      http.patch(`${HRM_BASE_PATH}/leave/request/:requestId/release`, () => {
        calls += 1;
        return ok(null);
      }),
    );
    const user = await openFromRow('승인');
    const dialog = within(
      await screen.findByRole('dialog', { name: '해당 요청을 승인하시겠습니까?' }),
    );
    await user.click(dialog.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toBe(1);
  });

  it('승인 요청 중에 Esc 로 모달을 닫아도 같은 행의 승인과 반려 버튼이 잠겨 있고, 끝나면 풀린다', async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    server.use(
      http.patch(`${HRM_BASE_PATH}/leave/request/:requestId/release`, async () => {
        calls += 1;
        await held;
        return ok(null);
      }),
    );
    const user = await openFromRow('승인');
    const dialog = within(
      await screen.findByRole('dialog', { name: '해당 요청을 승인하시겠습니까?' }),
    );
    await user.click(dialog.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(calls).toBe(1));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: '승인' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '반려' })).toBeDisabled();

    release();
    await waitFor(() => expect(screen.getByRole('button', { name: '반려' })).toBeEnabled());
    expect(screen.getByRole('button', { name: '승인' })).toBeEnabled();
    expect(calls).toBe(1);
  });

  it('반려: 모달에 사유 칸이 없고 요청은 본문 없이 한 번 나간다', async () => {
    // 게이트웨이 휴가 반려는 본문을 받지 않는다(HrmController.java:490)
    const bodies: string[] = [];
    server.use(
      http.patch(`${HRM_BASE_PATH}/leave/request/:requestId/reject`, async ({ request }) => {
        bodies.push(await request.text());
        return ok(null);
      }),
    );
    const user = await openFromRow('반려');
    const dialog = within(
      await screen.findByRole('dialog', { name: '해당 요청을 반려하시겠습니까?' }),
    );
    expect(dialog.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bodies).toEqual(['']);
  });
});
