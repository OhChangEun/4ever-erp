import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { dropAt, nullAt, serveEdited, valueAt } from '@/test/contract/mockData';
import { WAREHOUSE_ENDPOINTS } from '@/app/types/api';
import WarehouseDetailModal from './WarehouseDetailModal';

describe('창고 상세 모달의 빈 값(응답 null 허용 카드)', () => {
  it.each([
    ['null', nullAt],
    ['키 누락', dropAt],
  ])(
    '설명과 주소, 담당자 연락처가 %s 이어도 창고 정보를 그리고 빈 칸은 - 로 보인다',
    async (_, edit) => {
      const data = await serveEdited(WAREHOUSE_ENDPOINTS.WAREHOUSE_DETAIL('wh-001'), (d) => {
        edit(d, ['warehouseInfo', 'description']);
        edit(d, ['warehouseInfo', 'location']);
        edit(d, ['manager', 'managerPhoneNumber']);
        edit(d, ['manager', 'managerEmail']);
      });
      renderWithProviders(
        <WarehouseDetailModal
          id="m"
          onClose={() => undefined}
          handleWarehouseManage={() => undefined}
          selectedWarehouseId="wh-001"
          selectedWarehouseName="창고"
        />,
      );

      expect(
        await screen.findByText(String(valueAt(data, ['warehouseInfo', 'warehouseName']))),
      ).toBeInTheDocument();
      expect(screen.getAllByText('-')).toHaveLength(4);
    },
  );
});
