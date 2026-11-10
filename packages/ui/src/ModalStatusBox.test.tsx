import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalStatusBox from './ModalStatusBox';

describe('ModalStatusBox', () => {
  it('폼 안에서 닫기를 눌러도 제출하지 않는다', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <ModalStatusBox type="error" message="조회 실패" onClose={onClose} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: '닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
