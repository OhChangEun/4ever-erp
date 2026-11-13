'use client';

import { fetchDepartmentsDropdown, fetchEmployeesList } from '@/app/(private)/hrm/api/hrm.api';
import {
  type EmployeeData,
  type EmployeeListRequestParams,
} from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import { Dropdown } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { Pagination } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Table, type TableColumn } from '@everp/ui';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { EmployeeDetailModal } from '@/app/(private)/hrm/components/modals/EmployeeDetailModal';
import { EmployeeEditModal } from '@/app/(private)/hrm/components/modals/EmployeeEditModal';
import EmployeeRegisterModal from '@/app/(private)/hrm/components/modals/EmployeeRegisterModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import { Input } from '@everp/ui';
import { Button } from '@everp/ui';
import { employeeKeys } from '@/app/(private)/hrm/api/hrm.keys';

/** tabButtons: 하위 탭 세그먼트. 툴바 왼쪽에 둔다(SubNavigation 이 넘긴다) */
export default function EmployeesTab({ tabButtons }: { tabButtons?: ReactNode }) {
  const t = useTranslations('hrm');
  const { keyword, handleKeywordChange, debouncedKeyword } = useDebouncedKeyword();

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 모달창
  const { openModal } = useModal();

  // 부서 드롭다운
  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'with-all',
  );

  const employeesQueryParams = useMemo(
    (): EmployeeListRequestParams => ({
      departmentId: selectedDepartment || undefined,
      name: debouncedKeyword,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedDepartment, debouncedKeyword, currentPage, pageSize],
  );

  const {
    data: employeesData,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: employeeKeys.list(employeesQueryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchEmployeesList(employeesQueryParams),
  });

  // console.log(employeesData);

  const employees = employeesData?.content ?? [];
  const pageInfo = employeesData?.page;

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleEditEmployeeDetail = (emp: EmployeeData) => {
    openModal(EmployeeEditModal, { title: t('employees.editTitle'), employee: emp });
  };

  const handleViewEmployeeDetail = (emp: EmployeeData) => {
    openModal(EmployeeDetailModal, {
      title: t('employees.detailTitle'),
      employee: emp,
      onEdit: () => handleEditEmployeeDetail(emp),
    });
  };

  const handleViewEmployeeRegister = () => {
    openModal(EmployeeRegisterModal, {
      title: t('employees.register'),
    });
  };

  const columns: TableColumn<EmployeeData>[] = [
    {
      key: 'name',
      label: t('common.employee'),
      render: (_, employee) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
        </div>
      ),
    },
    {
      key: 'department',
      label: t('employees.department'),
      render: (_, employee) => (
        <div>
          <div className="text-sm text-gray-900">{employee.department}</div>
          <div className="text-sm text-gray-500">{employee.position}</div>
        </div>
      ),
    },
    { key: 'hireDate', label: t('common.hireDate') },
    {
      key: 'phone',
      label: t('employees.contact'),
      render: (_, employee) => (
        <div>
          <div className="text-sm text-gray-900">{employee.phone}</div>
          <div className="text-sm text-gray-500">{employee.email}</div>
        </div>
      ),
    },
    {
      key: 'action',
      label: t('common.actions'),
      align: 'right',
      render: (_, employee) => (
        <Button
          label={t('common.viewDetail')}
          size="sm"
          variant="ghost"
          onClick={() => handleViewEmployeeDetail(employee)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center gap-4 shrink-0">
        {tabButtons}
        <div className="flex items-center gap-4">
          <Dropdown
            placeholder={t('common.allDepartments')}
            items={departmentsOptions}
            value={selectedDepartment}
            onChange={(dept: string) => {
              setSelectedDepartment(dept);
              handleFilterChange();
            }}
          />
          <Input
            value={keyword}
            onChange={(event) => {
              handleKeywordChange(event);
              handleFilterChange();
            }}
            icon="ri-search-line"
            placeholder={t('common.searchName')}
          />
          <Button label={t('employees.register')} onClick={handleViewEmployeeRegister} />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox type="loading" message={t('employees.loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('employees.loadError')} error={error} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={employees}
          keyExtractor={(row) => row.employeeId}
          emptyMessage={t('employees.empty')}
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
