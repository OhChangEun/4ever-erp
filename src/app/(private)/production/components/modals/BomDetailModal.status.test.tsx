import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import BomDetailModal from './BomDetailModal';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/production',
}));

// 목과 지금 화면은 BOM 상태를 '활성'/'비활성' 글자로 주고받는다. 뱃지는 코드(ACTIVE)만 알아서
// 늘 회색이었고 영어 화면에도 '활성'이 그대로 보였다
describe('BOM 상세 상태 뱃지', () => {
  it("서버 값 '활성'도 활성 뱃지(초록)로 그린다", async () => {
    renderWithProviders(
      <BomDetailModal id="m" onClose={vi.fn()} bomId="bom-001" showStatusActions />,
    );
    const badge = await screen.findByText('활성', { selector: 'span' });
    expect(badge).toHaveClass('bg-green-100');
  });

  it("영어 화면에서는 '활성' 대신 Active", async () => {
    renderWithProviders(
      <BomDetailModal id="m" onClose={vi.fn()} bomId="bom-001" showStatusActions />,
      {
        locale: 'en',
      },
    );
    expect(await screen.findByText('Active', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('활성')).not.toBeInTheDocument();
  });
});
