import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { ok } from '@/mocks/utils';
import { scenarioResponse } from '@/mocks/scenario';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import ko from '@/i18n/messages/ko.json';
import { PURCHASE_BASE_PATH } from '@/app/(private)/purchase/api/purchase.endpoints';
import PurchaseRequestListTab from './PurchaseRequestListTab';

const APPROVE_URL = `${PURCHASE_BASE_PATH}/purchase-requisitions/:prId/release`;
const REJECT_URL = `${PURCHASE_BASE_PATH}/purchase-requisitions/:prId/reject`;

describe('구매 요청 확인 창과 반려 사유', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
    vi.restoreAllMocks();
  });

  /** 구매 담당으로 대기 요청 한 건(기본 목)을 띄우고 행 버튼을 누른다. 브라우저 기본 창은 쓰지 않아야 한다 */
  const openFromRow = async (button: string) => {
    // 승인과 반려는 MM 과 ALL_ADMIN 에게만 보인다
    useAuthStore
      .getState()
      .setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role: 'MM_USER' });
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestListTab />);
    await user.click(await screen.findByRole('button', { name: button }, { timeout: 3000 }));
    expect(nativeConfirm).not.toHaveBeenCalled();
    return user;
  };

  it('승인: 앱 모달에서 확인하면 요청이 한 번 나가고 닫힌다', async () => {
    let calls = 0;
    server.use(
      http.post(APPROVE_URL, () => {
        calls += 1;
        return ok(null);
      }),
    );
    const user = await openFromRow('승인');
    const dialog = within(
      await screen.findByRole('dialog', { name: '해당 요청을 승인하시겠습니까?' }),
    );
    expect(dialog.queryByRole('textbox')).not.toBeInTheDocument();
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
      http.post(APPROVE_URL, async () => {
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

  it('반려: 사유가 비면 요청이 안 나가고, 입력한 사유가 본문 comment 에 실리고, 성공하면 닫힌다', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(REJECT_URL, async ({ request }) => {
        bodies.push(await request.json());
        return ok(null);
      }),
    );
    const user = await openFromRow('반려');
    const dialog = within(
      await screen.findByRole('dialog', { name: '해당 요청을 반려하시겠습니까?' }),
    );
    const field = dialog.getByRole('textbox', { name: '반려 사유' });
    expect(field).toHaveAccessibleDescription('반려 사유를 입력해 주세요.');
    expect(dialog.getByRole('button', { name: '확인' })).toBeDisabled();
    await user.click(dialog.getByRole('button', { name: '확인' }));
    expect(bodies).toEqual([]);

    await user.type(field, '예산을 넘습니다');
    await user.click(dialog.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bodies).toEqual([{ comment: '예산을 넘습니다' }]);
  });

  it('반려 실패: 모달과 사유가 남고 오류가 보인다', async () => {
    let calls = 0;
    server.use(
      http.post(REJECT_URL, () => {
        calls += 1;
        return scenarioResponse('500');
      }),
    );
    const user = await openFromRow('반려');
    const dialog = within(
      await screen.findByRole('dialog', { name: '해당 요청을 반려하시겠습니까?' }),
    );
    await user.type(dialog.getByRole('textbox', { name: '반려 사유' }), '중복 요청');
    await user.click(dialog.getByRole('button', { name: '확인' }));

    expect(await screen.findByText(/반려 처리 중 오류가 발생했습니다/)).toHaveTextContent(
      ko.errors.server,
    );
    expect(calls).toBe(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: '반려 사유' })).toHaveValue('중복 요청');
    await waitFor(() => expect(dialog.getByRole('button', { name: '확인' })).toBeEnabled());
  });
});
