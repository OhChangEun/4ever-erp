'use client';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  fetchDepartmentsDropdown,
  fetchPayRollList,
  fetchPayrollStatusDropdown,
} from '@/app/(private)/hrm/api/hrm.api';
import { KeyValueItem } from '@/app/types/CommonType';
import Dropdown from '@/app/components/common/Dropdown';
import { PayrollDetailModal } from '@/app/(private)/hrm/components/modals/PayrollDetailModal';
import Pagination from '@/app/components/common/Pagination';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import Table, { TableColumn } from '@/app/components/common/Table';
import { PayRollList, PayrollRequestParams } from '@/app/(private)/hrm/types/HrmPayrollApiType';
import { useModal } from '@/app/components/common/modal/useModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import Input from '@/app/components/common/Input';
import StatusLabel from '@/app/components/common/StatusLabel';
import Button from '@/app/components/common/Button';

export default function PayrollManagement() {
  // --- 모달 출력 ---
  const { openModal } = useModal();
  const { keyword, handleKeywordChange, debouncedKeyword } = useDebouncedKeyword();

  // --- 드롭다운 ---
  // 부서 드롭다운
  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'include',
  );
  // 상태 드롭다운
  const { options: statusOptions } = useDropdown(
    'payrollStatusDropdown',
    fetchPayrollStatusDropdown,
    'include',
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
      years.push({ key: year, value: `${year}년` });
    }
    return years;
  }, []);

  // 월 옵션
  const monthOptions: KeyValueItem[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1);
      return { key: month, value: `${i + 1}월` };
    });
  }, []);

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
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['payrollList', payrollQueryParams],
    queryFn: () => fetchPayRollList(payrollQueryParams),
  });

  const payrollList = payrollData?.content ?? [];
  const pageInfo = payrollData?.page;

  type PayrollItem = (typeof payrollList)[0];

  const handleViewPayrollDetail = (payroll: PayRollList) => {
    openModal(PayrollDetailModal, {
      title: '급여 상세정보',
      payrollId: payroll.payrollId,
      payStatus: payroll.pay.statusCode,
      width: '600px',
      height: '680px',
    });
  };

  const columns: TableColumn<PayrollItem>[] = [
    {
      key: 'employeeName',
      label: '이름',
      render: (_, p) => p.employee.employeeName,
    },
    {
      key: 'department',
      label: '부서',
      render: (_, p) => p.employee.department,
    },
    {
      key: 'position',
      label: '직급',
      render: (_, p) => p.employee.position,
    },
    {
      key: 'basePay',
      label: '기본급',
      align: 'right',
      render: (_, p) => `${p.pay.basePay.toLocaleString()}원`,
    },
    {
      key: 'overtimePay',
      label: '초과근무비',
      align: 'right',
      render: (_, p) => `${p.pay.overtimePay.toLocaleString()}원`,
    },
    {
      key: 'deduction',
      label: '공제액',
      align: 'right',
      render: (_, p) => `${p.pay.deduction.toLocaleString()}원`,
    },
    {
      key: 'netPay',
      label: '실지급액',
      align: 'right',
      render: (_, p) => `${p.pay.netPay.toLocaleString()}원`,
    },
    {
      key: 'statusCode',
      label: '상태',
      render: (_, p) => <StatusLabel $statusCode={p.pay.statusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, p) => (
        <Button
          label="상세보기"
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
            placeholder="전체 년도"
            items={yearOptions}
            value={selectedYear}
            onChange={(year: string) => setSelectedYear(year)}
          />
          <Dropdown
            placeholder="전체 월"
            items={monthOptions}
            value={selectedMonth}
            onChange={(month: string) => setSelectedMonth(month)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Dropdown
            placeholder="전체 부서"
            items={departmentsOptions}
            value={selectedDepartment}
            onChange={(dept: string) => {
              setSelectedDepartment(dept);
              setCurrentPage(1);
            }}
          />
          <Dropdown
            placeholder="전체 상태"
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
            placeholder="직원 이름 검색"
          />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox $type="loading" $message="급여 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox $type="error" $message="급여 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
          columns={columns}
          data={payrollList}
          keyExtractor={(row) => row.payrollId}
          emptyMessage="급여 데이터가 없습니다."
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
