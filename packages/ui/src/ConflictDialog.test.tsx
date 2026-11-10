import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConflictDialog from './ConflictDialog';

describe('ConflictDialog', () => {
  it.each([
    ['상품', '상품을'],
    ['창고', '창고를'],
    ['견적서', '견적서를'],
    ['BOM', 'BOM을'],
  ])('한국어 대상 %s의 받침에 맞는 목적격 조사를 쓴다', (subject, object) => {
    render(
      <ConflictDialog subject={subject} onClose={() => undefined} onReload={() => undefined} />,
    );
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      `다른 사용자가 이미 이 ${object} 수정했습니다. 현재 화면의 데이터가 오래되어 수정 요청이 거부됐습니다.`,
    );
  });

  it('alertdialog 로 알리고 제목과 설명이 연결된다', () => {
    render(<ConflictDialog subject="BOM" onClose={() => undefined} onReload={() => undefined} />);
    const dialog = screen.getByRole('alertdialog', { name: '수정 충돌이 발생했습니다' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(/다른 사용자가 이미 이 BOM을 수정했습니다/);
  });

  it('버튼 두 개가 각각 닫기와 다시 불러오기를 부른다', async () => {
    const onClose = vi.fn();
    const onReload = vi.fn();
    render(<ConflictDialog subject="BOM" onClose={onClose} onReload={onReload} />);
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    await userEvent.click(screen.getByRole('button', { name: '최신 데이터 불러오기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('Esc 로 닫히고, Tab 은 대화상자 안에서만 돈다, 닫으면 원래 포커스로 돌아간다 (리뷰 A1)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">바깥 버튼</button>
      </>,
    );
    screen.getByRole('button', { name: '바깥 버튼' }).focus();
    rerender(
      <>
        <button type="button">바깥 버튼</button>
        <ConflictDialog subject="BOM" onClose={onClose} onReload={() => undefined} />
      </>,
    );
    const reload = screen.getByRole('button', { name: '최신 데이터 불러오기' });
    const close = screen.getByRole('button', { name: '닫기' });
    expect(reload).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(reload).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <button type="button">바깥 버튼</button>
      </>,
    );
    expect(screen.getByRole('button', { name: '바깥 버튼' })).toHaveFocus();
  });
});
