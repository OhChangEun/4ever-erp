'use client';

import DateRangePicker from '@/app/components/common/DateRangePicker';
import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchMpsBomDropdown, fetchMpsList } from '@/app/(private)/production/api/production.api';
import { useDropdown } from '@/app/hooks/useDropdown';
import { Pagination } from '@everp/ui';
import { Table, type TableColumn } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { mpsKeys } from '@/app/(private)/production/api/production.keys';
import { toDateKey } from '@/app/utils/date';
import { useTranslations } from 'next-intl';

interface MpsRow {
  productName: string;
  bomId: string;
  week: string;
  demand: number;
  requiredInventory: number;
  productionNeeded: number;
  plannedProduction: number;
}

export default function MpsTab() {
  const t = useTranslations('production');
  const { options: dropdownOptions } = useDropdown('mpsBomsDropdown', fetchMpsBomDropdown);

  const date = toDateKey(new Date());
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const mpsQueries = useQueries({
    queries: dropdownOptions.map((product) => ({
      queryKey: mpsKeys.list(product.key, startDate, endDate),
      queryFn: () =>
        fetchMpsList({
          bomId: product.key,
          startDate,
          endDate,
          page: 0,
          size: 100,
        }),
      enabled: !!startDate && !!endDate,
    })),
  });

  const isLoading = mpsQueries.some((q) => q.isLoading);
  const isError = mpsQueries.some((q) => q.isError);

  const allRows: MpsRow[] = useMemo(() => {
    const rows: MpsRow[] = [];
    mpsQueries.forEach((query) => {
      const data = query.data;
      if (!data?.content) return;
      data.content.forEach((week) => {
        rows.push({
          productName: data.productName,
          bomId: data.bomId,
          week: week.week,
          demand: week.demand,
          requiredInventory: week.requiredInventory,
          productionNeeded: week.productionNeeded,
          plannedProduction: week.plannedProduction,
        });
      });
    });
    return rows;
  }, [mpsQueries]);

  const totalElements = allRows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const paginatedRows = useMemo(
    () => allRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [allRows, currentPage],
  );

  const columns: TableColumn<MpsRow>[] = [
    {
      key: 'productName',
      label: t('common.productName'),
      render: (_, row) => <span className="font-medium text-gray-700">{row.productName}</span>,
    },
    {
      key: 'week',
      label: t('mps.week'),
      render: (_, row) => <span className="text-gray-600">{row.week}</span>,
    },
    {
      key: 'demand',
      label: t('common.demand'),
      render: (_, row) => <span className="text-gray-700">{row.demand}</span>,
    },
    {
      key: 'requiredInventory',
      label: t('common.requiredInventory'),
      render: (_, row) => <span className="text-gray-700">{row.requiredInventory}</span>,
    },
    {
      key: 'productionNeeded',
      label: t('common.productionNeeded'),
      render: (_, row) => <span className="text-sm text-gray-700">{row.productionNeeded}</span>,
    },
    {
      key: 'plannedProduction',
      label: t('common.plannedProduction'),
      render: (_, row) => (
        <span className="font-semibold text-blue-600">{row.plannedProduction}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-end shrink-0">
        <DateRangePicker
          startDate={startDate}
          onStartDateChange={(d) => {
            setStartDate(d);
            setCurrentPage(1);
          }}
          endDate={endDate}
          onEndDateChange={(d) => {
            setEndDate(d);
            setCurrentPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <TableStatusBox type="loading" message={t('mps.loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('mps.loadError')} />
      ) : (
        <Table
          columns={columns}
          data={paginatedRows}
          keyExtractor={(row, index) => `${row.bomId}-${row.week}-${index}`}
          hoverable={false}
          emptyMessage={t('mps.empty')}
          className="flex-1 min-h-0"
        />
      )}

      {!isLoading && !isError && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
}
