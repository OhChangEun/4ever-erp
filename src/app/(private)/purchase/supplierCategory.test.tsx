import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok } from '@/mocks/utils';
import { PURCHASE_ENDPOINTS } from './api/purchase.endpoints';
import SupplierListTab from './components/tabs/SupplierListTab';
import SupplierDetailModal from './components/modals/SupplierDetailModal';
import SupplierFormModal from './components/modals/SupplierFormModal';

/**
 * 남은 표시 결함 3 카드. 공급업체 카테고리 코드(MATERIAL)를 목록, 상세, 필터, 폼이 같은 글자로 보인다.
 * 목 공급업체의 카테고리는 MATERIAL 이다.
 */
const cases = [
  {
    locale: 'ko',
    material: '원자재',
    options: ['원자재', '부품', '기타'],
    filter: '전체 카테고리',
    pick: '카테고리 선택',
  },
  {
    locale: 'en',
    material: 'Raw materials',
    options: ['Raw materials', 'Parts', 'Other'],
    filter: 'All categories',
    pick: 'Select a category',
  },
] as const;

describe.each(cases)(
  '공급업체 카테고리 글자 ($locale)',
  ({ locale, material, options, filter, pick }) => {
    it('목록의 카테고리 칸', async () => {
      renderWithProviders(<SupplierListTab />, { locale });
      // 원자재 공급사는 대양상사, 하나금속, 동양소재 셋(카드 "데모 데이터 채우기")
      expect(await screen.findAllByRole('cell', { name: material })).toHaveLength(3);
      expect(screen.queryByRole('cell', { name: 'MATERIAL' })).not.toBeInTheDocument();
    });

    it('필터 드롭다운 옵션이 목록과 같은 글자', async () => {
      renderWithProviders(<SupplierListTab />, { locale });
      await userEvent.click(await screen.findByRole('combobox', { name: filter }));
      const names = (await screen.findAllByRole('option')).map((option) => option.textContent);
      expect(names).toEqual(options);
    });

    it('상세 모달', async () => {
      renderWithProviders(<SupplierDetailModal id="m" onClose={() => {}} supplierId="sup-001" />, {
        locale,
      });
      expect(await screen.findByText(material)).toBeInTheDocument();
      expect(screen.queryByText('MATERIAL')).not.toBeInTheDocument();
    });

    it('등록 폼 드롭다운 옵션', async () => {
      renderWithProviders(<SupplierFormModal id="m" onClose={() => {}} />, { locale });
      await userEvent.click(await screen.findByRole('combobox', { name: pick }));
      const listbox = await screen.findByRole('listbox');
      for (const name of options) {
        expect(await within(listbox).findByRole('option', { name })).toBeInTheDocument();
      }
    });
  },
);

it('서버가 모르는 카테고리 옵션을 주면 서버 글자를 그대로 보이고, 고르면 그 코드로 조회한다', async () => {
  const requested: (string | null)[] = [];
  server.use(
    http.get(PURCHASE_ENDPOINTS.SUPPLIER_CATEGORY_OPTIONS, () =>
      ok([
        { key: 'MATERIAL', value: '자재' },
        { key: 'SERVICE', value: '서비스' },
      ]),
    ),
    http.get(PURCHASE_ENDPOINTS.SUPPLIER, ({ request }) => {
      requested.push(new URL(request.url).searchParams.get('category'));
      return undefined; // 기본 목이 응답한다
    }),
  );
  renderWithProviders(<SupplierListTab />);
  const filter = await screen.findByRole('combobox', { name: '전체 카테고리' });
  await userEvent.click(filter);
  expect(await screen.findByRole('option', { name: '원자재' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('option', { name: '서비스' }));
  expect(filter).toHaveTextContent('서비스');
  await waitFor(() => expect(requested.at(-1)).toBe('SERVICE'));
});
