import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import productionKo from '@/i18n/messages/production/ko.json';
import MesDetail from './ProcessDetailModal';

/** 카드 "없는 건은 404". 기본 목 핸들러 그대로 목록에 없는 MES 를 연다 */
describe('목록에 없는 MES 상세', () => {
  it('오류 안내와 닫기 버튼이 보이고 다른 MES 의 내용은 안 보인다. 닫기는 모달을 닫는다', async () => {
    const onClose = vi.fn();
    renderWithProviders(<MesDetail id="m" onClose={onClose} mesId="nope-1" />);

    expect(await screen.findByText(productionKo.common.loadFailed)).toBeInTheDocument();
    expect(screen.queryByText(/MES-2026-/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
