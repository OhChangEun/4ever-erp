'use client';
import { useMemo, useState } from 'react';
import { Dropdown } from '@everp/ui';
import { Button } from '@everp/ui';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchMrpAvailableStatusDropdown,
  fetchMrpOrdersList,
  fetchMrpQuotationsDropdown,
} from '../../api/production.api';
import { useConvertMrpOrders } from '../../api/production.mutations';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Pagination } from '@everp/ui';
import { Table, type TableColumn } from '@everp/ui';
import {
  type FetchMrpOrdersListParams,
  type MrpOrdersListData,
  type MrpOrdersListResponse,
} from '../../types/MrpOrdersApiType';
import { useRouter } from 'next/navigation';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { mrpOrderKeys } from '@/app/(private)/production/api/production.keys';
import { useTranslations } from 'next-intl';
import { formatNumber } from '@/app/utils/number';
import { useRole } from '@/app/hooks/useRole';
import { hasRole, PP_PLANNING_ROLES } from '@/lib/authz/policy';

interface OrdersTabProps {
  tabButtons?: React.ReactNode;
}

export default function OrdersTab({ tabButtons }: OrdersTabProps) {
  const t = useTranslations('production');
  // mrp 순소요 - 견적 드롭다운
  const { options: mrpQuotationOptions } = useDropdown(
    'mrpQuotationsDropdown',
    fetchMrpQuotationsDropdown,
  );
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  // 계획 주문 전환은 게이트웨이가 PP 와 ALL_ADMIN 만 받는다
  const canConvert = hasRole(PP_PLANNING_ROLES, useRole());
  // mrp 순소요 - 가용 재고 상태 드롭다운
  const { options: mrpAvailableStatusOptions } = useDropdown(
    'mrpAvailableStatusDropdown',
    fetchMrpAvailableStatusDropdown,
  );

  const [selectedQuote, setSelectedQuote] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');

  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryParams = useMemo(
    (): FetchMrpOrdersListParams => ({
      quotationId: selectedQuote,
      availableStatusCode: selectedStockStatus,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedQuote, selectedStockStatus, currentPage],
  );

  const {
    data: orders,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery<MrpOrdersListResponse>({
    queryKey: mrpOrderKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchMrpOrdersList(queryParams),
  });

  // 다시 받기가 실패하면 캐시에 처리 전 목록이 남는다. 그 값으로 고르면 같은 쓰기가 또 가니 행이 없는 것으로 본다(표는 오류 상자)
  const orderItems: MrpOrdersListData[] = isError ? [] : (orders?.content ?? []);
  const pageInfo = orders?.page;

  const totalPages = pageInfo?.totalPages ?? 1;

  // 전환할 수 있는 품목은 미전환뿐이다. 선택은 그릴 때 지금 목록의 미전환 품목으로 거른다(전환 뒤 다시 받으면 빠진다)
  const convertibleItems = orderItems.filter((item) => item.convertStatus === 'NOT_CONVERTED');
  const selectedItems = convertibleItems.filter((item) =>
    selectedRequirements.includes(item.itemId),
  );
  const allSelected =
    convertibleItems.length > 0 && selectedItems.length === convertibleItems.length;

  const handleSelectAllRequirements = () => {
    setSelectedRequirements(allSelected ? [] : convertibleItems.map((item) => item.itemId));
  };

  const handleRequirementSelection = (id: string) => {
    setSelectedRequirements((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  // 계획 주문 전환 mutation
  const router = useRouter();
  const { mutate: mrpConvert, isPending: isConverting } = useConvertMrpOrders({
    onSuccess: () => {
      toast.success(t('requirements.convertSuccess'));
      router.push('/production?tab=mrp&subTab=orders');
    },
    // 실패를 success 토스트로 알리던 버그 수정
    onError: (error) =>
      toast.error(t('requirements.convertError', { message: errorMessageOf(error) })),
  });

  // 계획 주문 전환 실행
  const handleConvertToPlannedOrder = () => {
    if (selectedItems.length === 0) {
      toast.warning(t('requirements.selectToConvert'));
      return;
    }

    const body = {
      items: selectedItems.map((item) => ({
        quotationId: item.quotationId,
        itemId: item.itemId,
        quantity: item.requiredQuantity,
      })),
    };

    mrpConvert(body);
  };

  // --- 컨럼 정의 ---
  const columns: TableColumn<MrpOrdersListData>[] = [
    {
      key: 'itemId',
      label: '',
      width: '48px',
      headerRender: () => (
        <input
          type="checkbox"
          aria-label={t('requirements.selectAll')}
          checked={allSelected}
          onChange={handleSelectAllRequirements}
          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
      ),
      render: (_, item) =>
        item.convertStatus !== 'NOT_CONVERTED' ? (
          <input
            type="checkbox"
            aria-label={t('requirements.convertedRow', { name: item.itemName })}
            disabled
            className="rounded border-gray-300 text-gray-300"
          />
        ) : (
          <input
            type="checkbox"
            aria-label={t('common.selectRow', { name: item.itemName })}
            checked={selectedRequirements.includes(item.itemId)}
            onChange={() => handleRequirementSelection(item.itemId)}
            className="rounded border-gray-300 cursor-pointer"
          />
        ),
    },
    { key: 'itemName', label: t('common.material') },
    {
      key: 'requiredQuantity',
      label: t('requirements.requiredQuantity'),
      render: (_, item) => <>{formatNumber(item.requiredQuantity)}</>,
    },
    {
      key: 'availableStock',
      label: t('requirements.availableStock'),
      render: (_, item) => <>{formatNumber(item.availableStock)}</>,
    },
    {
      key: 'consumptionQuantity',
      label: t('requirements.consumption'),
      render: (_, item) => <>{formatNumber(item.consumptionQuantity)}</>,
    },
    {
      key: 'availableStatusCode',
      label: t('requirements.availableStatus'),
      render: (_, item) => <StatusLabel statusCode={item.availableStatusCode} />,
    },
    {
      key: 'shortageQuantity',
      label: t('requirements.shortage'),
      render: (_, item) =>
        item.shortageQuantity > 0 ? (
          <span className="text-red-600 font-medium">{formatNumber(item.shortageQuantity)}</span>
        ) : (
          <>0</>
        ),
    },
    {
      key: 'itemType',
      label: t('requirements.itemType'),
      render: (_, item) => <StatusLabel statusCode={item.itemType} />,
    },
    {
      key: 'procurementStartDate',
      label: t('common.procurementStartDate'),
      render: (_, item) => <>{item.procurementStartDate || '-'}</>,
    },
    {
      key: 'expectedArrivalDate',
      label: t('requirements.expectedArrival'),
      render: (_, item) => <>{item.expectedArrivalDate || '-'}</>,
    },
    { key: 'supplierCompanyName', label: t('common.supplier') },
    {
      key: 'convertStatus',
      label: t('requirements.convertStatus'),
      render: (_, item) => <StatusLabel statusCode={item.convertStatus} />,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center shrink-0">
        {tabButtons}
        <div className="flex gap-4 items-center">
          <Dropdown
            placeholder={t('common.selectQuote')}
            items={mrpQuotationOptions}
            value={selectedQuote}
            onChange={(quote: string) => {
              setSelectedQuote(quote);
              setCurrentPage(1);
            }}
            autoSelectFirst
          />
          <Dropdown
            placeholder={t('common.allStatuses')}
            items={mrpAvailableStatusOptions}
            value={selectedStockStatus}
            onChange={(status: string) => {
              setSelectedStockStatus(status);
              setCurrentPage(1);
            }}
          />
          {canConvert && (
            <Button
              label={t('requirements.convert')}
              onClick={handleConvertToPlannedOrder}
              loading={isConverting}
              disabled={selectedItems.length === 0}
            />
          )}
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox type="loading" message={t('requirements.loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('requirements.loadError')} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={orderItems}
          keyExtractor={(row) => row.itemId}
          emptyMessage={t('requirements.empty')}
          className="flex-1 min-h-0"
        />
      )}

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
}
