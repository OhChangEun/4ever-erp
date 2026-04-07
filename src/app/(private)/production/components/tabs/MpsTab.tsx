'use client';

import DateRangePicker from '@/app/components/common/DateRangePicker';
import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchMpsBomDropdown, fetchMpsList } from '@/app/(private)/production/api/production.api';
import { MpsListParams, MpsListResponse } from '@/app/(private)/production/types/MpsApiType';
import { useDropdown } from '@/app/hooks/useDropdown';
import Pagination from '@/app/components/common/Pagination';
import Table, { TableColumn } from '@/app/components/common/Table';
import TableStatusBox from '@/app/components/common/TableStatusBox';

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
  const { options: dropdownOptions } = useDropdown('mpsBomsDropdown', fetchMpsBomDropdown);

  const date = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const mpsQueries = useQueries({
    queries: dropdownOptions.map((product) => ({
      queryKey: ['mpsList', product.key, startDate, endDate],
      queryFn: () =>
        fetchMpsList({
          bomId: product.key,
          startDate,
          endDate,
          page: 0,
          size: 100,
        } as MpsListParams),
      enabled: !!startDate && !!endDate,
      staleTime: 1000,
    })),
  });

  const isLoading = mpsQueries.some((q) => q.isLoading);
  const isError = mpsQueries.some((q) => q.isError);

  const allRows: MpsRow[] = useMemo(() => {
    const rows: MpsRow[] = [];
    mpsQueries.forEach((query) => {
      const data = query.data as MpsListResponse | undefined;
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
      label: '제품명',
      align: 'center',
      render: (_, row) => <span className="font-medium text-gray-700">{row.productName}</span>,
    },
    {
      key: 'week',
      label: '주차',
      align: 'center',
      render: (_, row) => <span className="text-gray-600">{row.week}</span>,
    },
    {
      key: 'demand',
      label: '수요',
      align: 'center',
      render: (_, row) => <span className="text-gray-700">{row.demand ?? '-'}</span>,
    },
    {
      key: 'requiredInventory',
      label: '재고 필요량',
      align: 'center',
      render: (_, row) => <span className="text-gray-700">{row.requiredInventory ?? '-'}</span>,
    },
    {
      key: 'productionNeeded',
      label: '생산 소요량',
      align: 'center',
      render: (_, row) => (
        <span className="text-sm text-gray-700">{row.productionNeeded ?? '-'}</span>
      ),
    },
    {
      key: 'plannedProduction',
      label: '계획 생산 (MPS)',
      align: 'center',
      render: (_, row) => (
        <span className="font-semibold text-blue-600">{row.plannedProduction ?? '-'}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
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

      <div className="flex flex-col flex-1 min-h-0 bg-white rounded overflow-hidden">
        {isLoading ? (
          <TableStatusBox $type="loading" $message="MPS 데이터를 불러오는 중입니다..." />
        ) : isError ? (
          <TableStatusBox $type="error" $message="데이터를 불러오는 데 실패했습니다." />
        ) : (
          <Table
            columns={columns}
            data={paginatedRows}
            keyExtractor={(row, index) => `${row.bomId}-${row.week}-${index}`}
            hoverable={false}
            emptyMessage="조회된 MPS 데이터가 없습니다."
          />
        )}
      </div>

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
