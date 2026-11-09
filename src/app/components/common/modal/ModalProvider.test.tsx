import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';
import type { ModalProps } from './types';

function Inner({ onClose }: ModalProps) {
  return (
    <div>
      <input aria-label="안쪽 입력" />
      <button type="button" onClick={onClose}>
        안쪽 닫기
      </button>
    </div>
  );
}

function Outer({ onClose }: ModalProps) {
  const { openModal } = useModal();
  return (
    <div>
      <input aria-label="바깥 모달 입력" />
      <button type="button" onClick={() => openModal(Inner, { title: '두 번째' })}>
        하나 더 열기
      </button>
      <button type="button" onClick={onClose}>
        바깥 닫기
      </button>
    </div>
  );
}

function Page() {
  const { openModal } = useModal();
  return (
    <button type="button" onClick={() => openModal(Outer, { title: '첫 번째' })}>
      모달 열기
    </button>
  );
}

const setup = async () => {
  render(
    <ModalProvider>
      <Page />
    </ModalProvider>,
  );
  const trigger = screen.getByRole('button', { name: '모달 열기' });
  await userEvent.click(trigger);
  return { trigger, dialog: screen.getByRole('dialog', { name: '첫 번째' }) };
};

describe('모달(포커스와 키보드)', () => {
  it('열리면 포커스가 모달 안으로 간다', async () => {
    const { dialog } = await setup();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('Tab 을 계속 눌러도 포커스가 모달 밖으로 나가지 않는다', async () => {
    const { dialog } = await setup();
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('Esc 로 닫고 포커스를 연 버튼으로 돌린다', async () => {
    const { trigger } = await setup();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('모달이 겹치면 Esc 는 맨 위 모달만 닫는다', async () => {
    await setup();
    await userEvent.click(screen.getByRole('button', { name: '하나 더 열기' }));
    expect(screen.getByRole('dialog', { name: '두 번째' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '두 번째' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '첫 번째' })).toBeInTheDocument();
  });

  it('바깥(배경)을 눌러도 닫히지 않는다(입력 중인 폼을 잃지 않게)', async () => {
    await setup();
    await userEvent.click(document.body);
    expect(screen.getByRole('dialog', { name: '첫 번째' })).toBeInTheDocument();
  });
});
