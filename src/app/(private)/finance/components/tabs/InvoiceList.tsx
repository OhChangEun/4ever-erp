'use client';

import { useMemo, useState } from 'react';
import { VOUCHER_STATUS_OPTIONS } from '@/app/(private)/finance/constants';
import { InvoiceStatus } from '@/app/(private)/finance/types/InvoiceListType';
import { useQuery } from '@tanstack/react-query';
import { getPurchaseInvoicesList, getSalesInvoicesList } from '@/app/(private)/finance/finance.api';
import { InvoiceTab, invoiceKeys } from '@/app/(private)/finance/finance.keys';
import { useCompleteInvoice, type InvoiceAction } from '@/app/(private)/finance/finance.mutations';
import { Pagination } from '@everp/ui';
import { useSearchParams } from 'next/navigation';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Table, TableColumn } from '@everp/ui';
import InvoiceDetailModal from '@/app/(private)/finance/components/modals/InvoiceDetailModal';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useRole } from '@/app/hooks/useRole';
import { Button } from '@everp/ui';
import { Dropdown } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';

import { formatCurrency } from '@/app/utils/number';
const InvoiceList = () => {
  const searchParams = useSearchParams();
  const role = useRole();
  const defaultTab: InvoiceTab =
    role === 'SUPPLIER_ADMIN' ? 'sales' : role === 'CUSTOMER_ADMIN' ? 'purchase' : 'sales';
  const tabParam = searchParams.get('tab');
  // 기존 분기 유지: tab 파라미터가 있으면 'sales'만 매출, 그 외 값은 모두 매입으로 취급
  const currentTab: InvoiceTab = tabParam
    ? tabParam === 'sales'
      ? 'sales'
      : 'purchase'
    : defaultTab;
  // 선택은 탭별로 기억한다. 다른 탭으로 가면 선택이 없다(예전엔 effect 로 지웠다)
  const [selection, setSelection] = useState<{ tab: InvoiceTab; invoiceId: string }>({
    tab: currentTab,
    invoiceId: '',
  });
  const selectedInvoiceId = selection.tab === currentTab ? selection.invoiceId : '';
  const setSelectedInvoiceId = (invoiceId: string) => setSelection({ tab: currentTab, invoiceId });

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
      status: statusFilter || 'ALL',
    }),
    [currentPage, statusFilter],
  );

  const queryFn =
    currentTab === 'sales'
      ? () => getSalesInvoicesList(queryParams)
      : () => getPurchaseInvoicesList(queryParams);

  const {
    data: invoiceReq,
    isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: invoiceKeys.list(currentTab, queryParams),
    // 같은 탭(매출/매입) 안에서만 이전 페이지를 유지한다. 탭이 바뀌면 다른 탭의 전표가 보이면 안 된다
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === currentTab ? previous : undefined,
    queryFn: queryFn,
  });

  const invoices = invoiceReq?.data ?? [];
  const pageInfo = invoiceReq?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  type InvoiceItem = (typeof invoices)[0];

  const { openModal } = useModal();
  const toast = useToast();
  // 어느 API 를 부를지는 역할과 탭이 정한다. 무효화 범위는 finance.mutations.ts 한 곳.
  const invoiceAction: InvoiceAction =
    role === 'SUPPLIER_ADMIN' ? 'supplierAp' : currentTab === 'sales' ? 'ar' : 'ap';
  const { mutate: sendReq, isPending: isCompleting } = useCompleteInvoice({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`등록 중 오류가 발생했습니다. ${errorMessageOf(error)}`),
  });

  // ----------------------------------------------------------
  const handleViewDetail = (id: string) => {
    setSelectedInvoiceId(id);
    openModal(InvoiceDetailModal, {
      title: '전표 상세 정보',
      width: '900px',
      selectedInvoiceId: id,
    });
  };
  const handleSelectVoucher = (voucherId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoiceId(voucherId);
    } else {
      setSelectedInvoiceId('');
    }
  };

  // useEffect(() => {
  //   console.log(selectedInvoiceId);
  // }, [selectedInvoiceId]);

  const handleReceivableComplete = () => {
    sendReq({ invoiceId: selectedInvoiceId, tab: currentTab, action: invoiceAction });
  };

  const columns: TableColumn<InvoiceItem>[] = [
    {
      key: 'invoiceId',
      label: '',
      render: (_, invoice) => (
        <input
          type="checkbox"
          aria-label={`${invoice.invoiceNumber} 선택`}
          checked={selectedInvoiceId === invoice.invoiceId}
          disabled={
            currentTab === 'sales'
              ? invoice.statusCode === 'PAID' || invoice.statusCode === 'UNPAID'
              : currentTab === 'purchase'
                ? role === 'SUPPLIER_ADMIN'
                  ? invoice.statusCode === 'PAID' || invoice.statusCode === 'UNPAID'
                  : role === 'CUSTOMER_ADMIN'
                    ? invoice.statusCode === 'PAID' || invoice.statusCode === 'PENDING'
                    : invoice.statusCode === 'PAID' || invoice.statusCode === 'PENDING'
                : false
          }
          onChange={(e) => handleSelectVoucher(invoice.invoiceId, e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    { key: 'invoiceNumber', label: '전표번호' },
    {
      key: 'connection',
      label: '거래처',
      render: (_, invoice) => invoice.connection.connectionName,
    },
    {
      key: 'totalAmount',
      label: '금액',
      align: 'right',
      render: (_, invoice) => formatCurrency(invoice.totalAmount),
    },
    { key: 'issueDate', label: '발행일' },
    { key: 'dueDate', label: '만기일' },
    {
      key: 'statusCode',
      label: '상태',
      render: (_, invoice) => <StatusLabel statusCode={invoice.statusCode} />,
    },
    {
      key: 'referenceNumber',
      label: '참조번호',
      render: (_, invoice) => (
        <span className="text-blue-600 hover:text-blue-500 cursor-pointer">
          {invoice.referenceNumber}
        </span>
      ),
    },
    {
      key: 'action',
      label: '작업',
      align: 'right',
      render: (_, invoice) => (
        <Button
          label="상세"
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:bg-gray-100 px-2"
          onClick={() => handleViewDetail(invoice.invoiceId)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <i className="ri-shopping-cart-line text-blue-600 text-lg"></i>
          <h2 className="text-lg font-semibold text-gray-900">
            {currentTab === 'sales' ? '매출 전표 목록' : '매입 전표 목록'}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <Dropdown
            placeholder="전체 상태"
            items={VOUCHER_STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            autoSelectFirst
          />

          <Button
            label="미수 처리 신청"
            onClick={handleReceivableComplete}
            loading={isCompleting}
            disabled={selectedInvoiceId ? false : true}
          />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox type="loading" message="전표 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox type="error" message="전표 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={invoices}
          keyExtractor={(row) => row.invoiceId}
          emptyMessage="등록된 전표가 없습니다."
          className="flex-1 min-h-0"
        />
      )}
      {/* 페이지네이션 */}
      {isError || isLoading ? null : (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={pageInfo?.totalElements}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
};

export default InvoiceList;
