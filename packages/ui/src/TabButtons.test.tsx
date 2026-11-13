import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TabButtons from './TabButtons';

const TABS = [
  { id: 'producing', name: '생산중 (3)' },
  { id: 'ready', name: '출고 준비 완료 (1)' },
];

describe('TabButtons(세그먼트)', () => {
  it('선택된 버튼만 aria-pressed=true 다. 색만으로 선택을 알리지 않는다', () => {
    render(
      <TabButtons label="출고 관리 탭" tabs={TABS} activeTab="ready" onTabChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: '출고 준비 완료 (1)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '생산중 (3)' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('묶음은 이름 있는 group 이다(낭독기가 무엇을 고르는 묶음인지 읽는다)', () => {
    render(
      <TabButtons label="출고 관리 탭" tabs={TABS} activeTab="ready" onTabChange={() => {}} />,
    );
    const group = screen.getByRole('group', { name: '출고 관리 탭' });
    expect(group).toContainElement(screen.getByRole('button', { name: '생산중 (3)' }));
  });

  it('키보드(Tab, Enter, Space)로 고른다', async () => {
    const onTabChange = vi.fn();
    render(
      <TabButtons
        label="출고 관리 탭"
        tabs={TABS}
        activeTab="producing"
        onTabChange={onTabChange}
      />,
    );
    const user = userEvent.setup();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: '출고 준비 완료 (1)' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onTabChange.mock.calls).toEqual([['ready'], ['ready']]);
  });

  it('폼 안에서 눌러도 제출하지 않는다', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <TabButtons label="출고 관리 탭" tabs={TABS} activeTab="producing" onTabChange={() => {}} />
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: '출고 준비 완료 (1)' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
