import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlTestProvider } from '@/test/render';
import type { Locale } from '@/i18n/locale';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';
import type { ModalProps } from './types';
import ConfirmModal from './ConfirmModal';

const TITLE = '해당 요청을 반려하시겠습니까?';
const REASON = { label: '반려 사유', required: '반려 사유를 입력해 주세요.' };

interface OpenerProps {
  onConfirm: (reason: string) => Promise<unknown>;
  reason?: { label: string; required: string };
}

function Opener(props: OpenerProps) {
  const { openModal } = useModal();
  return (
    <button type="button" onClick={() => openModal(ConfirmModal, { title: TITLE, ...props })}>
      열기
    </button>
  );
}

/** 아래에 깔리는 모달. 안의 버튼으로 확인 모달을 겹쳐 연다 */
function Below(_: ModalProps) {
  return (
    <div>
      <input aria-label="아래 모달 입력" />
      <Opener onConfirm={() => Promise.resolve()} reason={REASON} />
    </div>
  );
}

function StackOpener() {
  const { openModal } = useModal();
  return (
    <button type="button" onClick={() => openModal(Below, { title: '아래 모달' })}>
      아래 모달 열기
    </button>
  );
}

const open = async (props: OpenerProps, locale: Locale = 'ko') => {
  const user = userEvent.setup();
  render(
    <IntlTestProvider locale={locale}>
      <ModalProvider>
        <Opener {...props} />
      </ModalProvider>
    </IntlTestProvider>,
  );
  await user.click(screen.getByRole('button', { name: '열기' }));
  // 모달 틀은 dynamic import 라 조금 뒤에 뜬다
  const dialog = await screen.findByRole('dialog', { name: TITLE });
  return { user, dialog: within(dialog) };
};

const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

describe('공통 확인 모달', () => {
  it('제목이 모달 이름이고, 사유 칸이 없으면 취소 버튼에 포커스가 간다', async () => {
    const { dialog } = await open({ onConfirm: vi.fn(() => Promise.resolve()) });
    expect(dialog.queryByRole('textbox')).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: '확인' })).toBeEnabled();
    await waitFor(() => expect(dialog.getByRole('button', { name: '취소' })).toHaveFocus());
  });

  it('취소와 Esc 는 onConfirm 을 부르지 않고 닫는다', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    const { user, dialog } = await open({ onConfirm });
    await user.click(dialog.getByRole('button', { name: '취소' }));
    await closed();

    await user.click(screen.getByRole('button', { name: '열기' }));
    await screen.findByRole('dialog', { name: TITLE });
    await user.keyboard('{Escape}');
    await closed();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('요청 중에는 두 버튼이 잠기고, 확인을 두 번 눌러도 한 번만 부르고, 성공하면 닫힌다', async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { user, dialog } = await open({ onConfirm });
    await user.click(dialog.getByRole('button', { name: '확인' }));
    await user.click(dialog.getByRole('button', { name: '확인' }));
    expect(dialog.getByRole('button', { name: '확인' })).toBeDisabled();
    expect(dialog.getByRole('button', { name: '취소' })).toBeDisabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    finish();
    await closed();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('사유 칸이 있으면 사유 칸에 포커스가 가고, 비거나 공백뿐이면 확인이 잠기고 이유가 설명으로 붙는다', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    const { user, dialog } = await open({ onConfirm, reason: REASON });
    const field = dialog.getByRole('textbox', { name: REASON.label });
    await waitFor(() => expect(field).toHaveFocus());
    expect(field).toBeRequired();
    expect(field).toHaveAccessibleDescription(REASON.required);
    expect(dialog.getByRole('button', { name: '확인' })).toBeDisabled();

    await user.type(field, '   ');
    expect(dialog.getByRole('button', { name: '확인' })).toBeDisabled();
    await user.click(dialog.getByRole('button', { name: '확인' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('입력한 사유를 앞뒤 공백을 빼고 onConfirm 에 넘긴다', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    const { user, dialog } = await open({ onConfirm, reason: REASON });
    await user.type(
      dialog.getByRole('textbox', { name: REASON.label }),
      '  단가가 계약과 다릅니다 ',
    );
    expect(dialog.getByRole('textbox', { name: REASON.label })).not.toHaveAccessibleDescription();
    await user.click(dialog.getByRole('button', { name: '확인' }));
    await closed();
    expect(onConfirm).toHaveBeenCalledWith('단가가 계약과 다릅니다');
  });

  it('실패하면 열린 채 사유가 남고 버튼이 풀려 다시 보낼 수 있다', async () => {
    const onConfirm = vi
      .fn<(reason: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('서버 오류'))
      .mockResolvedValueOnce();
    const { user, dialog } = await open({ onConfirm, reason: REASON });
    await user.type(dialog.getByRole('textbox', { name: REASON.label }), '납기 불가');
    await user.click(dialog.getByRole('button', { name: '확인' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(dialog.getByRole('button', { name: '확인' })).toBeEnabled());
    expect(dialog.getByRole('button', { name: '취소' })).toBeEnabled();
    expect(dialog.getByRole('textbox', { name: REASON.label })).toHaveValue('납기 불가');

    await user.click(dialog.getByRole('button', { name: '확인' }));
    await closed();
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('요청 중 Esc 로 닫아도 요청은 한 번이고, 닫힌 뒤 실패해도 처리 안 된 rejection 없이 지나간다', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      let fail: (error: Error) => void = () => undefined;
      const onConfirm = vi.fn(
        () =>
          new Promise<void>((_, reject) => {
            fail = reject;
          }),
      );
      const { user, dialog } = await open({ onConfirm });
      await user.click(dialog.getByRole('button', { name: '확인' }));
      await user.keyboard('{Escape}');
      await closed();

      fail(new Error('서버 오류'));
      // rejection 이 모달의 catch 까지 가고, 처리 안 됐다면 node 가 알릴 틈을 준다
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).not.toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('다른 모달 위에 겹쳐 떠도 처음 포커스는 닫기(X)가 아니라 사유 칸이다', async () => {
    const user = userEvent.setup();
    render(
      <IntlTestProvider>
        <ModalProvider>
          <StackOpener />
        </ModalProvider>
      </IntlTestProvider>,
    );
    await user.click(screen.getByRole('button', { name: '아래 모달 열기' }));
    const below = within(await screen.findByRole('dialog', { name: '아래 모달' }));
    await user.click(below.getByRole('button', { name: '열기' }));
    const dialog = within(await screen.findByRole('dialog', { name: TITLE }));
    await waitFor(() => expect(dialog.getByRole('textbox', { name: REASON.label })).toHaveFocus());
  });

  it('영어 로케일에서 버튼이 Cancel 과 OK 다', async () => {
    const { dialog } = await open({ onConfirm: vi.fn(() => Promise.resolve()) }, 'en');
    expect(dialog.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
  });
});
