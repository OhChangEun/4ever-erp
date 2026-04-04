// tabs/LeaveTab.tsx
'use client';
import {
  fetchDepartmentsDropdown,
  fetchLeaveList,
  postLeaveReject,
  postLeaveRelease,
} from '@/app/(private)/hrm/api/hrm.api';
import { LeaveRequestParams } from '@/app/(private)/hrm/types/HrmLeaveApiType';
import Dropdown from '@/app/components/common/Dropdown';
import Input from '@/app/components/common/Input';
import Pagination from '@/app/components/common/Pagination';
import StatusLabel from '@/app/components/common/StatusLabel';
import Table, { TableColumn } from '@/app/components/common/Table';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

export default function LeaveTab() {
  // --- 모달 출력 ---
  const { keyword, handleKeywordChange, debouncedKeyword } = useDebouncedKeyword();

  // 부서 드롭다운
  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'include',
  );

  // --- 드롭다운 ---
  const [selectedDepartment, setSelectedDepartment] = useState(''); // 부서

  // --- 페이지 네이션 ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const leaveQueryParams = useMemo(
    (): LeaveRequestParams => ({
      department: selectedDepartment || undefined,
      name: debouncedKeyword,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedDepartment, debouncedKeyword, currentPage],
  );

  const queryClient = useQueryClient();
  const {
    data: leaveData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['leaveList', leaveQueryParams],
    queryFn: () => fetchLeaveList(leaveQueryParams),
  });

  const leaveList = leaveData?.content ?? [];
  const pageInfo = leaveData?.page;

  type LeaveItem = (typeof leaveList)[0];

  const { mutate: approveLeave } = useMutation({
    mutationFn: (requestId: string) => postLeaveRelease(requestId),
    onSuccess: () => {
      alert('승인이 완료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['leaveList'], exact: false });
    },
    onError: (error) => {
      alert(`휴가 승인 중 오류가 발생했습니다. ${error}`);
    },
  });

  const { mutate: rejectLeave } = useMutation({
    mutationFn: (requestId: string) => postLeaveReject(requestId),
    onSuccess: () => {
      alert('반료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['leaveList'], exact: false });
    },
    onError: (error) => {
      alert(`휴가 반려 중 오류가 발생했습니다. ${error}`);
    },
  });

  const handleApprove = (requestId: string) => {
    if (confirm('해당 요청을 승인하시겠습니까?')) {
      approveLeave(requestId);
    }
  };

  const handleReject = (requestId: string) => {
    if (confirm('해당 요청을 반려하시겠습니까?')) {
      rejectLeave(requestId);
    }
  };

  const columns: TableColumn<LeaveItem>[] = [
    {
      key: 'employee',
      label: '직원 정보',
      render: (_, leave) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{leave.employee.employeeName}</div>
          <div className="text-sm text-gray-500">{leave.employee.position}</div>
        </div>
      ),
    },
    {
      key: 'leaveType',
      label: '휴가 유형',
      render: (_, leave) => <StatusLabel $statusCode={leave.leaveType} />,
    },
    {
      key: 'startDate',
      label: '시작 일자',
      render: (_, leave) => leave.startDate.split('T')[0],
    },
    {
      key: 'endDate',
      label: '종료 일자',
      render: (_, leave) => leave.endDate.split('T')[0],
    },
    {
      key: 'numberOfLeaveDays',
      label: '일수',
      render: (_, leave) => `${leave.numberOfLeaveDays}일`,
    },
    {
      key: 'remainingLeaveDays',
      label: '잔여 연차',
      render: (_, leave) => `${leave.remainingLeaveDays}일`,
    },
    {
      key: 'status',
      label: '작업',
      align: 'center',
      render: (_, leave) =>
        leave.status === 'PENDING' ? (
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => handleApprove(leave.leaveRequestId)}
              className="text-green-600 hover:text-green-900 cursor-pointer"
              title="승인"
            >
              <i className="ri-check-line"></i>
            </button>
            <button
              onClick={() => handleReject(leave.leaveRequestId)}
              className="text-red-600 hover:text-red-900 cursor-pointer"
              title="반려"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        ) : (
          <StatusLabel $statusCode={leave.status} />
        ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-end shrink-0">
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

          <Input
            value={keyword}
            onChange={handleKeywordChange}
            icon="ri-search-line"
            placeholder="직원 이름 검색"
          />
        </div>
      </div>
      {isLoading ? (
        <TableStatusBox $type="loading" $message="휴가 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox $type="error" $message="휴가 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
          columns={columns}
          data={leaveList}
          keyExtractor={(row) => row.leaveRequestId}
          emptyMessage="휴가 요청이 없습니다."
          className="flex-1 min-h-0"
        />
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={pageInfo?.totalPages ?? 1}
        totalElements={pageInfo?.totalElements}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
