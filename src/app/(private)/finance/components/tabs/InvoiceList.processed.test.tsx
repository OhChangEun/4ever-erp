import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { error, makePage, ok } from '@/mocks/utils';
import { FINANCE_ENDPOINTS } from '@/app/types/api';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { countRequests } from '@/test/countRequests';
import { mockApi } from '@/test/mockApi';
import * as z from 'zod';
import InvoiceList from './InvoiceList';

// 탭은 주소의 tab 파라미터로 고른다. 기본은 매출 탭
const search = vi.hoisted(() => ({ params: '' }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search.params),
}));
afterEach(() => {
  search.params = '';
});

/**
 * 이미 처리된 건의 버튼 카드. 기본 목은 처리 요청을 기억한다.
 * 역할이 없으면 매출 탭이고 처리는 매출 수금 완료(ar)다.
 */

/**
 * 기본 목 매출 전표 첫 쪽의 첫 수금 대기 전표. 매출 전표는 주문에서 날짜로 만들어(카드 "데모 목록 인사 재무")
 * 번호를 정해 두지 않고 목에서 꺼낸다. 예전에는 한 줄 목록의 AR-2026-001 이었다
 */
const firstPending = async () => {
  const body = z
    .object({
      data: z.object({
        content: z.array(
          z.object({ invoiceId: z.string(), invoiceNumber: z.string(), statusCode: z.string() }),
        ),
      }),
    })
    .parse(await mockApi('GET', '/business/fcm/invoice/ar?page=0&size=10'));
  const row = body.data.content.find((invoice) => invoice.statusCode === 'PENDING');
  if (!row) throw new Error('매출 전표 첫 쪽에 수금 대기 전표가 없다');
  return row;
};
const salesRow = (invoiceId: string, invoiceNumber: string, statusCode: string) => ({
  invoiceId,
  invoiceNumber,
  connection: { connectionId: 'cus-001', connectionCode: 'CUS-001', connectionName: '한빛전자' },
  totalAmount: 1000,
  issueDate: '2026-01-20',
  dueDate: '2026-02-20',
  statusCode,
  referenceNumber: `REF-${invoiceNumber}`,
});

const useSalesRows = (rows: ReturnType<typeof salesRow>[]) =>
  server.use(
    http.get(FINANCE_ENDPOINTS.SALES_INVOICES_LIST, () =>
      ok({ content: rows, page: makePage(0, 10, rows.length) }),
    ),
  );

const REQUEST = '미수 처리 신청';
const checkbox = (invoiceNumber: string) =>
  screen.findByRole('checkbox', { name: `${invoiceNumber} 선택` });

describe('전표 목록: 처리한 전표는 다시 처리할 수 없다', () => {
  it('처리할 수 있는 전표는 고를 수 있고, 고르면 처리 요청이 열린다', async () => {
    const target = await firstPending();
    const user = userEvent.setup();
    renderWithProviders(<InvoiceList />);

    const box = await checkbox(target.invoiceNumber);
    expect(box).toBeEnabled();
    expect(screen.getByRole('button', { name: REQUEST })).toBeDisabled();
    await user.click(box);
    expect(screen.getByRole('button', { name: REQUEST })).toBeEnabled();
  });

  it('처리 요청 뒤 그 전표는 잠기고 체크가 풀리며, 버튼을 다시 눌러도 두 번째 요청이 없다', async () => {
    const target = await firstPending();
    const posts = countRequests('POST', FINANCE_ENDPOINTS.SALES_INVOICE_COMPLETE(target.invoiceId));
    const user = userEvent.setup();
    renderWithProviders(<InvoiceList />);

    await user.click(await checkbox(target.invoiceNumber));
    await user.click(screen.getByRole('button', { name: REQUEST }));

    const row = within(await screen.findByRole('row', { name: new RegExp(target.invoiceNumber) }));
    await waitFor(() => expect(row.getByText('완납')).toBeInTheDocument());
    const box = await checkbox(target.invoiceNumber);
    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();
    const button = screen.getByRole('button', { name: REQUEST });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(posts()).toBe(1);
  });

  // 남은 한국어 문자열 카드: 성공 안내는 서버 message 대신 화면 문구(언어를 따른다)
  it('처리 요청이 성공하면 서버 message 가 아니라 화면 문구로 알린다', async () => {
    const target = await firstPending();
    server.use(
      http.post(FINANCE_ENDPOINTS.SALES_INVOICE_COMPLETE(target.invoiceId), () =>
        HttpResponse.json({ status: 200, success: true, message: '수금 처리가 완료되었습니다.' }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<InvoiceList />, { locale: 'en' });

    await user.click(
      await screen.findByRole('checkbox', { name: `Select ${target.invoiceNumber}` }),
    );
    await user.click(screen.getByRole('button', { name: 'Request settlement' }));
    expect(await screen.findByText('Settlement request sent.')).toBeInTheDocument();
    expect(screen.queryByText('수금 처리가 완료되었습니다.')).not.toBeInTheDocument();
  });

  it('완납 전표의 상세를 열어도 처리 요청이 열리지 않는다', async () => {
    useSalesRows([salesRow('inv-paid', 'AR-PAID', 'PAID')]);
    const user = userEvent.setup();
    renderWithProviders(<InvoiceList />);

    const row = within(await screen.findByRole('row', { name: /AR-PAID/ }));
    await user.click(row.getByRole('button', { name: '상세' }));
    // 상세 모달이 뜨면 뒤 화면은 aria-hidden 이다
    expect(screen.getByRole('button', { name: REQUEST, hidden: true })).toBeDisabled();
  });

  it('모르는 상태 값의 전표는 고를 수 없다', async () => {
    // verified=false: 게이트웨이가 전표 상태를 Object 로 넘겨 다른 값이 올 수 있다
    useSalesRows([salesRow('inv-x', 'AR-UNKNOWN', 'SOMETHING_NEW')]);
    renderWithProviders(<InvoiceList />);
    expect(await checkbox('AR-UNKNOWN')).toBeDisabled();
  });

  it('고른 전표가 다시 받은 목록에서 처리할 수 없는 상태면 선택에서 빠진다', async () => {
    useSalesRows([salesRow('inv-1', 'AR-ONE', 'PENDING')]);
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<InvoiceList />);

    await user.click(await checkbox('AR-ONE'));
    expect(screen.getByRole('button', { name: REQUEST })).toBeEnabled();

    // 다른 사람이 먼저 처리했다
    useSalesRows([salesRow('inv-1', 'AR-ONE', 'PAID')]);
    await act(() => queryClient.invalidateQueries());

    await waitFor(() => expect(screen.getByRole('button', { name: REQUEST })).toBeDisabled());
    expect(await checkbox('AR-ONE')).not.toBeChecked();
  });
});

describe('전표 목록 리뷰 반영', () => {
  it('처리 성공 뒤 목록을 다시 못 받으면 버튼이 잠기고 두 번째 요청이 없다', async () => {
    const target = await firstPending();
    const posts = countRequests('POST', FINANCE_ENDPOINTS.SALES_INVOICE_COMPLETE(target.invoiceId));
    const user = userEvent.setup();
    renderWithProviders(<InvoiceList />);

    await user.click(await checkbox(target.invoiceNumber));
    // 처리는 성공하지만 그 뒤 목록 재조회가 실패한다. 캐시에는 처리 전(대기) 목록이 남는다
    server.use(http.get(FINANCE_ENDPOINTS.SALES_INVOICES_LIST, () => error('Failed to load', 500)));
    await user.click(screen.getByRole('button', { name: REQUEST }));
    expect(
      await screen.findByText('전표 목록을 불러오는 중 오류가 발생했습니다.'),
    ).toBeInTheDocument();

    const button = screen.getByRole('button', { name: REQUEST });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(posts()).toBe(1);
  });

  it('사내 매입 탭에서 확인 대기(RESPONSE_PENDING) 전표는 고를 수 있다', async () => {
    // verified=false: 공급사가 매입 전표를 이 값으로 바꾸는 API 가 있다(FcmController.java:247). 예전 화면도 열어 두었다
    search.params = 'tab=purchase';
    server.use(
      http.get(FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST, () =>
        ok({
          content: [salesRow('inv-ap-r', 'AP-RESP', 'RESPONSE_PENDING')],
          page: makePage(0, 10, 1),
        }),
      ),
    );
    renderWithProviders(<InvoiceList />);
    expect(await checkbox('AP-RESP')).toBeEnabled();
  });
});
