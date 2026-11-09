import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConflictDialog from './ConflictDialog';

describe('ConflictDialog', () => {
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
});
