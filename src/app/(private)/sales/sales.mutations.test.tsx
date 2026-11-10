import { describe, it } from 'vitest';
import { expectMatrix } from '@/test/mutationMatrix';
import { customerKeys, quoteKeys, salesOrderKeys, salesStatsKeys } from './sales.keys';
import {
  useConfirmQuotation,
  useCreateCustomer,
  useUpdateCustomer,
  useCreateQuote,
  useCheckInventory,
  useProcessDelivery,
} from './sales.mutations';

const FOREIGN = ['purchase', 'orders', 'list'];
const QUOTE_LIST = quoteKeys.list({ page: 0, size: 10 });
const ORDER_LIST = salesOrderKeys.list({
  page: 0,
  size: 10,
  startDate: '',
  endDate: '',
  keyword: '',
  type: '',
  status: 'ALL',
});
const CUSTOMER_LIST = customerKeys.list({ page: 0, size: 10 });

describe('영업 mutation 훅', () => {
  it('견적 생성 → 견적 목록, 통계', () =>
    expectMatrix({
      name: '',
      useHook: useCreateQuote,
      variables: { items: [] },
      invalidates: [QUOTE_LIST, salesStatsKeys.byRole('ALL_ADMIN')],
      keeps: [ORDER_LIST, CUSTOMER_LIST, FOREIGN],
    }));

  it('검토 요청 → 견적 목록, 상세, 검토 상세, 통계', () =>
    expectMatrix({
      name: '',
      useHook: useConfirmQuotation,
      variables: 'q-1',
      invalidates: [
        QUOTE_LIST,
        quoteKeys.detail('q-1'),
        quoteKeys.reviewDetail('q-1'),
        salesStatsKeys.byRole('ALL_ADMIN'),
      ],
      keeps: [ORDER_LIST, CUSTOMER_LIST, FOREIGN],
    }));

  it('즉시 납품 → 견적 목록, 상세, 검토 상세, 주문 목록, 통계', () =>
    expectMatrix({
      name: '',
      useHook: useProcessDelivery,
      variables: 'q-1',
      invalidates: [
        QUOTE_LIST,
        quoteKeys.detail('q-1'),
        quoteKeys.reviewDetail('q-1'),
        ORDER_LIST,
        salesStatsKeys.byRole('ALL_ADMIN'),
      ],
      keeps: [CUSTOMER_LIST, FOREIGN],
    }));

  it('고객 등록(생성, 낙관적 없음) → 고객 목록만', () =>
    expectMatrix({
      name: '',
      useHook: useCreateCustomer,
      variables: {
        companyName: '신규상사',
        businessNumber: '123-45-67890',
        ceoName: '홍길동',
        contactPhone: '02-000-0000',
        contactEmail: 'a@b.c',
        zipCode: '00000',
        address: '서울',
        detailAddress: '',
        manager: { name: '김담당', mobile: '010-0000-0000', email: 'm@b.c' },
        note: '',
      },
      invalidates: [CUSTOMER_LIST],
      keeps: [QUOTE_LIST, ORDER_LIST, FOREIGN],
    }));

  it('재고 확인(계산 요청) → 아무것도 무효화하지 않는다', () =>
    expectMatrix({
      name: '',
      useHook: useCheckInventory,
      variables: [{ itemId: 'item-1', requiredQuantity: 3 }],
      invalidates: [],
      keeps: [QUOTE_LIST, ORDER_LIST, CUSTOMER_LIST],
    }));

  it('고객 수정 → 고객 목록과 그 고객 상세', () =>
    expectMatrix({
      name: '',
      useHook: useUpdateCustomer,
      variables: {
        customerId: 'cus-1',
        data: {
          customerName: '새상사',
          ceoName: '홍길동',
          businessNumber: '123',
          customerPhone: '02',
          customerEmail: 'a@b.c',
          baseAddress: '서울',
          detailAddress: '',
          statusCode: 'ACTIVE',
          manager: { name: '김', mobile: '010', email: 'm@b.c' },
          note: '',
        },
      },
      invalidates: [CUSTOMER_LIST, customerKeys.detail('cus-1')],
      keeps: [customerKeys.detail('cus-2'), QUOTE_LIST, FOREIGN],
    }));
});
