'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  fetchDepartmentsDropdown,
  fetchPayRollList,
  fetchPayrollStatusDropdown,
} from '@/app/(private)/hrm/api/hrm.api';
import { type KeyValueItem } from '@/app/types/CommonType';
import { Dropdown } from '@everp/ui';
import { PayrollDetailModal } from '@/app/(private)/hrm/components/modals/PayrollDetailModal';
import { Pagination } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Table, type TableColumn } from '@everp/ui';
import {
  type PayRollList,
  type PayrollRequestParams,
} from '@/app/(private)/hrm/types/HrmPayrollApiType';
import { useModal } from '@/app/components/common/modal/useModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import { Input } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Button } from '@everp/ui';
import { payrollKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { formatCurrency } from '@/app/utils/number';
export default function PayrollManagement() {
  const t = useTranslations('hrm');
  // --- 모달 출력 ---
  const { openModal } = useModal();
  const { keyword, handleKeywordChange, debouncedKeyword } = useDebouncedKeyword();

  // --- 드롭다운 ---
  // 부서 드롭다운
  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'with-all',
  );
  // 상태 드롭다운
  const { options: statusOptions } = useDropdown(
    'payrollStatusDropdown',
    fetchPayrollStatusDropdown,
    'with-all',
  );

  // --- 선택된 드롭다운 상태 ---
  const [selectedDepartment, setSelectedDepartment] = useState(''); // 부서
  const [selectedPayrollStatus, setSelectedPayrollStatus] = useState(''); // 상태

  // 년도와 월
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // --- 페이지 네이션 ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 년도 옵션 (최근 5년)
  const yearOptions: KeyValueItem[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      const year = (currentYear - i).toString();
      years.push({ key: year, value: t('payroll.year', { year }) });
    }
    return years;
  }, [t]);

  // 월 옵션
  const monthOptions: KeyValueItem[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1);
      return { key: month, value: t('month', { month }) };
    });
  }, [t]);

  const payrollQueryParams = useMemo(
    (): PayrollRequestParams => ({
      year: Number(selectedYear),
      month: Number(selectedMonth),
      name: debouncedKeyword,
      department: selectedDepartment || undefined,
      statusCode: selectedPayrollStatus || undefined,
      page: currentPage - 1,
      size: pageSize,
    }),
    [
      selectedYear,
      selectedMonth,
      debouncedKeyword,
      selectedDepartment,
      selectedPayrollStatus,
      currentPage,
    ],
  );

  const {
    data: payrollData,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: payrollKeys.list(payrollQueryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchPayRollList(payrollQueryParams),
  });

  const payrollList = payrollData?.content ?? [];
  const pageInfo = payrollData?.page;

  type PayrollItem = (typeof payrollList)[0];

  const handleViewPayrollDetail = (payroll: PayRollList) => {
    openModal(PayrollDetailModal, {
      title: t('payroll.detailTitle'),
      payrollId: payroll.payrollId,
      payStatus: payroll.pay.statusCode,
      width: '600px',
      height: '680px',
    });
  };

  const columns: TableColumn<PayrollItem>[] = [
    {
      key: 'employeeName',
      label: t('common.name'),
      render: (_, p) => p.employee.employeeName,
    },
    {
      key: 'department',
      label: t('common.department'),
      render: (_, p) => p.employee.department,
    },
    {
      key: 'position',
      label: t('common.position'),
      render: (_, p) => p.employee.position,
    },
    {
      key: 'basePay',
      label: t('payroll.basePay'),
      align: 'right',
      render: (_, p) => formatCurrency(p.pay.basePay),
    },
    {
      key: 'overtimePay',
      label: t('payroll.overtimePay'),
      align: 'right',
      render: (_, p) => formatCurrency(p.pay.overtimePay),
    },
    {
      key: 'deduction',
      label: t('payroll.deduction'),
      align: 'right',
      render: (_, p) => formatCurrency(p.pay.deduction),
    },
    {
      key: 'netPay',
      label: t('payroll.netPay'),
      align: 'right',
      render: (_, p) => formatCurrency(p.pay.netPay),
    },
    {
      key: 'statusCode',
      label: t('common.status'),
      render: (_, p) => <StatusLabel statusCode={p.pay.statusCode} />,
    },
    {
      key: 'action',
      label: t('common.actions'),
      align: 'right',
      render: (_, p) => (
        <Button
          label={t('common.viewDetail')}
          size="sm"
          variant="ghost"
          onClick={() => handleViewPayrollDetail(p)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center gap-2 shrink-0">
        <div className="flex pl-1 gap-2">
          <Dropdown
            placeholder={t('payroll.allYears')}
            items={yearOptions}
            value={selectedYear}
            onChange={(year: string) => setSelectedYear(year)}
          />
          <Dropdown
            placeholder={t('payroll.allMonths')}
            items={monthOptions}
            value={selectedMonth}
            onChange={(month: string) => setSelectedMonth(month)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Dropdown
            placeholder={t('common.allDepartments')}
            items={departmentsOptions}
            value={selectedDepartment}
            onChange={(dept: string) => {
              setSelectedDepartment(dept);
              setCurrentPage(1);
            }}
          />
          <Dropdown
            placeholder={t('common.allStatuses')}
            items={statusOptions}
            value={selectedPayrollStatus}
            onChange={(status: string) => {
              setSelectedPayrollStatus(status);
              setCurrentPage(1);
            }}
          />
          <Input
            value={keyword}
            onChange={handleKeywordChange}
            icon="ri-search-line"
            placeholder={t('common.searchName')}
          />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox type="loading" message={t('payroll.loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('payroll.loadError')} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={payrollList}
          keyExtractor={(row) => row.payrollId}
          emptyMessage={t('payroll.empty')}
          className="flex-1 min-h-0"
        />
      )}
      {isError || isLoading ? null : (
        <Pagination
          currentPage={currentPage}
          totalPages={pageInfo?.totalPages ?? 1}
          totalElements={pageInfo?.totalElements}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
}
