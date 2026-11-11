import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { dropAt, nullAt, serveEdited, valueAt } from '@/test/contract/mockData';
import { INVENTORY_ENDPOINTS } from '@/app/types/api';
import InventoryDetailModal from './InventoryDetailModal';

describe('재고 상세 모달의 빈 값(응답 null 허용 카드)', () => {
  it.each([
    ['null', nullAt],
    ['키 누락', dropAt],
  ])('최종 수정일이 %s 이어도 품목 정보를 그리고 수정일은 - 로 보인다', async (_, edit) => {
    const data = await serveEdited(INVENTORY_ENDPOINTS.INVENTORY_DETAIL('inv-1'), (d) => {
      edit(d, ['lastModified']);
    });
    renderWithProviders(
      <InventoryDetailModal id="m" onClose={() => undefined} selectedItemId="inv-1" />,
    );

    expect(await screen.findByText(String(valueAt(data, ['itemName'])))).toBeInTheDocument();
    expect(screen.getByText('최종 수정:').nextElementSibling?.textContent).toBe('-');
  });
});
