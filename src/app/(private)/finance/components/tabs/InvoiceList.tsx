'use client';

import { useEffect, useMemo, useState } from 'react';
import { VOUCHER_STATUS_OPTIONS } from '@/app/(private)/finance/constants';
import { InvoiceStatus } from '@/app/(private)/finance/types/InvoiceListType';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseInvoicesList,
  getSalesInvoicesList,
  postApInvoice,
  postArInvoice,
  postSupplierApInvoice,
} from '@/app/(private)/finance/finance.api';
import Pagination from '@/app/components/common/Pagination';
import { useSearchParams } from 'next/navigation';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import Table, { TableColumn } from '@/app/components/common/Table';
import InvoiceDetailModal from '@/app/(private)/finance/components/modals/InvoiceDetailModal';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useRole } from '@/app/hooks/useRole';
import IconButton from '@/app/components/common/IconButton';
import Button from '@/app/components/common/Button';
import Dropdown from '@/app/components/common/Dropdown';
import { useModal } from '@/app/components/common/modal/useModal';
import { useToast } from '@/app/components/common/toast/useToast';

const InvoiceList = () => {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const role = useRole();
  // const role = 'CUSTOMER_ADMIN';
  // const role = 'SUPPLIER_ADMIN';
  const defaultTab =
    role === 'SUPPLIER_ADMIN' ? 'sales' : role === 'CUSTOMER_ADMIN' ? 'purchase' : 'sales';
  const currentTab = searchParams.get('tab') || defaultTab;
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSelectedInvoiceId('');
  }, [currentTab]);

  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
      status: statusFilter || 'ALL',
    }),
    [currentPage, statusFilter],
  );

  // const queryParams = {
  //   page: currentPage - 1,
  //   size: 10,
  //   status: statusFilter || 'ALL',
  // };

  const queryFn =
    currentTab === 'sales'
      ? () => getSalesInvoicesList(queryParams)
      : () => getPurchaseInvoicesList(queryParams);

  const queryKey = [
    currentTab === 'sales' ? 'salesInvoiceList' : 'purchaseInvoiceList',
    queryParams,
  ];

  const {
    data: invoiceReq,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKey,
    queryFn: queryFn,
    staleTime: 1000,
  });

  const invoices = invoiceReq?.data ?? [];
  const pageInfo = invoiceReq?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  type InvoiceItem = (typeof invoices)[0];

  const { openModal } = useModal();
  const toast = useToast();
  const mutationFn =
    role === 'SUPPLIER_ADMIN'
      ? () => postSupplierApInvoice(selectedInvoiceId)
      : currentTab === 'sales'
        ? () => postArInvoice(selectedInvoiceId)
        : () => postApInvoice(selectedInvoiceId);

  const { mutate: sendReq } = useMutation({
    mutationFn: mutationFn,
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: () => {
      toast.error('등록 중 오류가 발생했습니다.');
    },
    onSettled: () => {
      const key = currentTab === 'sales' ? 'salesInvoiceList' : 'purchaseInvoiceList';
      queryClient.invalidateQueries({ queryKey: [key] });
    },
  });

  // ----------------------------------------------------------
  const handleViewDetail = (id: string) => {
    setSelectedInvoiceId(id);
    openModal(InvoiceDetailModal, {
      title: '전표 상세 정보',
      width: '900px',
      $selectedInvoiceId: id,
      $setSelectedInvoiceId: setSelectedInvoiceId,
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
    sendReq();
  };

  const columns: TableColumn<InvoiceItem>[] = [
    {
      key: 'invoiceId',
      label: '',
      render: (_, invoice) => (
        <input
          type="checkbox"
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
      render: (_, invoice) => `₩${invoice.totalAmount.toLocaleString()}`,
    },
    { key: 'issueDate', label: '발행일' },
    { key: 'dueDate', label: '만기일' },
    {
      key: 'statusCode',
      label: '상태',
      render: (_, invoice) => <StatusLabel $statusCode={invoice.statusCode} />,
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
      align: 'center',
      render: (_, invoice) => (
        <button
          onClick={() => handleViewDetail(invoice.invoiceId)}
          className="text-blue-600 hover:text-blue-500 cursor-pointer"
        >
          <i className="ri-eye-line"></i>
        </button>
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
            onChange={(status: string) => setStatusFilter(status as InvoiceStatus)}
            autoSelectFirst
          />

          <Button
            variant="green"
            label="미수 처리 신청"
            onClick={handleReceivableComplete}
            disabled={selectedInvoiceId ? false : true}
          />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox $type="loading" $message="전표 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox $type="error" $message="전표 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
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
