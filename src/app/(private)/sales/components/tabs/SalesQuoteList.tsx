'use client';

import { useMemo, useState } from 'react';
import { type QuoteStatus, type Quote } from '@/app/(private)/sales/types/SalesQuoteListType';
import QuoteDetailModal from '../modals/QuoteDetailModal';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getQuoteList } from '@/app/(private)/sales/sales.api';
import { quoteKeys } from '@/app/(private)/sales/sales.keys';
import { useDebounce } from 'use-debounce';
import QuoteReviewModal from '../modals/QuoteReviewModal';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Table, type TableColumn } from '@everp/ui';
import { getQuoteSearchKeywordOptions, QUOTE_STATUS_OPTIONS } from '@/app/(private)/sales/constant';
import { Pagination } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useRole } from '@/app/hooks/useRole';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { Dropdown } from '@everp/ui';
import { SearchBar } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';

import { formatCurrency } from '@/app/utils/number';
import { Button } from '@everp/ui';
import { useTranslations } from 'next-intl';
const SalesQuoteList = () => {
  const { openModal } = useModal();
  const t = useTranslations('sales.quoteList');
  const tc = useTranslations('sales.common');
  const ts = useTranslations('status');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('quotationNumber');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus>('ALL');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 200);
  const [currentPage, setCurrentPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
      startDate: startDate || '',
      endDate: endDate || '',
      status: statusFilter,
      type: searchType || '',
      keyword: debouncedSearchTerm || '',
    }),
    [startDate, endDate, currentPage, statusFilter, searchType, debouncedSearchTerm],
  );

  const {
    data: quoteRes,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: quoteKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => getQuoteList(queryParams),
  });

  const quotes = quoteRes?.data ?? [];
  const pageInfo = quoteRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  type QuoteItem = (typeof quotes)[0];

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuotationId(quote.quotationId);
    openModal(QuoteDetailModal, {
      width: '900px',
      height: '600px',
      title: t('detailModalTitle', { number: quote.quotationNumber }),
      selectedQuotationId: quote.quotationId,
    });
  };

  const handleCheckboxChange = (quotationId: string) => {
    setSelectedQuotationId((prev) => (prev === quotationId ? '' : quotationId));
  };
  const handleViewReview = () => {
    openModal(QuoteReviewModal, {
      width: '900px',
      title: t('reviewRequest'),
      selectedQuotationId: selectedQuotationId,
    });
  };

  const role = useRole();
  const quoteOptions = getQuoteSearchKeywordOptions(role).map((code) => ({
    key: code,
    value: t(`searchType.${code}`),
  }));
  const statusOptions = QUOTE_STATUS_OPTIONS.map((code) => ({
    key: code,
    value: code === 'ALL' ? tc('allStatuses') : ts(code),
  }));

  const columns: TableColumn<QuoteItem>[] = [
    {
      key: 'quotationId',
      label: t('columns.select'),
      render: (_, quote) => (
        <input
          type="checkbox"
          aria-label={t('selectRow', { number: quote.quotationNumber })}
          checked={selectedQuotationId === quote.quotationId}
          onChange={() => handleCheckboxChange(quote.quotationId)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'quotationNumber',
      label: t('columns.number'),
      render: (_, q) => (
        <span className="text-sm font-medium text-gray-900">{q.quotationNumber}</span>
      ),
    },
    { key: 'customerName', label: t('columns.customer') },
    { key: 'managerName', label: t('columns.manager') },
    { key: 'quotationDate', label: t('columns.quotationDate') },
    { key: 'dueDate', label: t('columns.dueDate') },
    {
      key: 'totalAmount',
      label: t('columns.totalAmount'),
      align: 'right',
      render: (_, q) => formatCurrency(q.totalAmount),
    },
    {
      key: 'statusCode',
      label: t('columns.status'),
      render: (_, q) => <StatusLabel statusCode={q.statusCode} />,
    },
    {
      key: 'action',
      label: t('columns.action'),
      align: 'right',
      render: (_, quote) => (
        <Button
          label={tc('detail')}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:bg-gray-100 px-2"
          onClick={() => handleViewQuote(quote)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 헤더 및 필터 */}
      <div className="flex flex-col space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <DateRangePicker
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
          />
          <div className="flex items-center space-x-4">
            <Dropdown
              placeholder={tc('allStatuses')}
              items={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              autoSelectFirst
            />
            <SearchBar
              options={quoteOptions}
              onTypeChange={(type: string) => setSearchType(type)}
              onKeywordSearch={(keyword) => {
                setSearchTerm(keyword);
                setCurrentPage(1);
              }}
              placeholder={tc('searchPlaceholder')}
            />
            <Button
              label={t('reviewRequest')}
              onClick={handleViewReview}
              disabled={selectedQuotationId === ''}
            />
          </div>
        </div>
      </div>

      {/* 견적 목록 */}
      <div className="flex flex-col flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <TableStatusBox type="loading" message={t('loading')} />
        ) : isError ? (
          <TableStatusBox type="error" message={t('loadError')} />
        ) : (
          <Table
            isStale={isPlaceholderData}
            columns={columns}
            data={quotes}
            keyExtractor={(row) => row.quotationId}
            emptyMessage={t('empty')}
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
    </div>
  );
};

export default SalesQuoteList;
