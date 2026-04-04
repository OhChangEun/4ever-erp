'use client';

import { fetchDepartmentsDropdown, fetchEmployeesList } from '@/app/(private)/hrm/api/hrm.api';
import {
  EmployeeData,
  EmployeeListRequestParams,
} from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import Dropdown from '@/app/components/common/Dropdown';
import IconButton from '@/app/components/common/IconButton';
import { useModal } from '@/app/components/common/modal/useModal';
import Pagination from '@/app/components/common/Pagination';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import Table, { TableColumn } from '@/app/components/common/Table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { EmployeeDetailModal } from '@/app/(private)/hrm/components/modals/EmployeeDetailModal';
import { EmployeeEditModal } from '@/app/(private)/hrm/components/modals/EmployeeEditModal';
import EmployeeRegisterModal from '@/app/(private)/hrm/components/modals/EmployeeRegisterModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import Input from '@/app/components/common/Input';
import Button from '@/app/components/common/Button';

export default function EmployeesTab() {
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
    'include',
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
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['employeesList', employeesQueryParams],
    queryFn: () => fetchEmployeesList(employeesQueryParams),
    staleTime: 1000,
  });

  // console.log(employeesData);

  const employees = employeesData?.content ?? [];
  const pageInfo = employeesData?.page;

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleEditEmployeeDetail = (emp: EmployeeData) => {
    openModal(EmployeeEditModal, { title: '직원정보 수정', employee: emp });
  };

  const handleViewEmployeeDetail = (emp: EmployeeData) => {
    openModal(EmployeeDetailModal, {
      title: '직원 상세보기',
      employee: emp,
      onEdit: () => handleEditEmployeeDetail(emp),
    });
  };

  const handleViewEmployeeRegister = () => {
    openModal(EmployeeRegisterModal, {
      title: '신규 직원 등록',
    });
  };

  const columns: TableColumn<EmployeeData>[] = [
    {
      key: 'name',
      label: '직원 정보',
      render: (_, employee) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
        </div>
      ),
    },
    {
      key: 'department',
      label: '부서/직급',
      render: (_, employee) => (
        <div>
          <div className="text-sm text-gray-900">{employee.department}</div>
          <div className="text-sm text-gray-500">{employee.position}</div>
        </div>
      ),
    },
    { key: 'hireDate', label: '입사일' },
    {
      key: 'phone',
      label: '연락처',
      render: (_, employee) => (
        <div>
          <div className="text-sm text-gray-900">{employee.phone}</div>
          <div className="text-sm text-gray-500">{employee.email}</div>
        </div>
      ),
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, employee) => (
        <Button
          label="상세보기"
          size="sm"
          variant="ghost"
          onClick={() => handleViewEmployeeDetail(employee)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-end items-center gap-4 p-2 rounded-lg shrink-0">
        <Dropdown
          placeholder="전체 부서"
          items={departmentsOptions}
          value={selectedDepartment}
          onChange={(dept: string) => setSelectedDepartment(dept)}
        />
        <Input
          value={keyword}
          onChange={handleKeywordChange}
          icon="ri-search-line"
          placeholder="직원 이름 검색"
        />
        <IconButton
          icon="ri-user-add-line"
          label="신규 직원 등록"
          onClick={handleViewEmployeeRegister}
        />
      </div>

      {isLoading ? (
        <TableStatusBox $type="loading" $message="직원 정보를 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox $type="error" $message="직원 정보를 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
          columns={columns}
          data={employees}
          keyExtractor={(row) => row.employeeId}
          emptyMessage="등록된 직원이 없습니다."
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
