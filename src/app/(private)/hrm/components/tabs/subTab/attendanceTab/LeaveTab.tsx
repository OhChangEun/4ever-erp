// tabs/LeaveTab.tsx
'use client';
import { fetchDepartmentsDropdown, fetchLeaveList } from '@/app/(private)/hrm/api/hrm.api';
import { type LeaveRequestParams } from '@/app/(private)/hrm/types/HrmLeaveApiType';
import { Dropdown } from '@everp/ui';
import { Input } from '@everp/ui';
import { Pagination } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Table, type TableColumn } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/app/components/common/toast/useToast';
import { useApproveLeave, useRejectLeave } from '@/app/(private)/hrm/api/hrm.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { leaveKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { Button } from '@everp/ui';
export default function LeaveTab() {
  const t = useTranslations('hrm');
  // --- 모달 출력 ---
  const { keyword, handleKeywordChange, debouncedKeyword } = useDebouncedKeyword();
  const toast = useToast();

  // 부서 드롭다운
  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'with-all',
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

  const {
    data: leaveData,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: leaveKeys.list(leaveQueryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchLeaveList(leaveQueryParams),
  });

  const leaveList = leaveData?.content ?? [];
  const pageInfo = leaveData?.page;

  type LeaveItem = (typeof leaveList)[0];

  // mutation 과 무효화 범위는 hrm.mutations.ts 한 곳.
  const { mutate: approveLeave, isPending: isApproving } = useApproveLeave({
    onSuccess: () => toast.success(t('leave.approved')),
    onError: (error) => toast.error(t('leave.approveError', { message: errorMessageOf(error) })),
  });
  const { mutate: rejectLeave, isPending: isRejecting } = useRejectLeave({
    onSuccess: () => toast.info(t('leave.rejected')),
    onError: (error) => toast.error(t('leave.rejectError', { message: errorMessageOf(error) })),
  });

  const handleApprove = (requestId: string) => {
    if (confirm(t('leave.approveConfirm'))) {
      approveLeave(requestId);
    }
  };

  const handleReject = (requestId: string) => {
    if (confirm(t('leave.rejectConfirm'))) {
      rejectLeave(requestId);
    }
  };

  const columns: TableColumn<LeaveItem>[] = [
    {
      key: 'employee',
      label: t('common.employee'),
      render: (_, leave) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{leave.employee.employeeName}</div>
          <div className="text-sm text-gray-500">{leave.employee.position}</div>
        </div>
      ),
    },
    {
      key: 'leaveType',
      label: t('leave.type'),
      render: (_, leave) => <StatusLabel statusCode={leave.leaveType} />,
    },
    {
      key: 'startDate',
      label: t('leave.startDate'),
      render: (_, leave) => leave.startDate.split('T')[0],
    },
    {
      key: 'endDate',
      label: t('leave.endDate'),
      render: (_, leave) => leave.endDate.split('T')[0],
    },
    {
      key: 'numberOfLeaveDays',
      label: t('leave.days'),
      render: (_, leave) => t('common.days', { count: leave.numberOfLeaveDays }),
    },
    {
      key: 'remainingLeaveDays',
      label: t('leave.remaining'),
      render: (_, leave) => t('common.days', { count: leave.remainingLeaveDays }),
    },
    {
      key: 'status',
      label: t('common.actions'),
      render: (_, leave) =>
        leave.status === 'PENDING' ? (
          <div className="flex items-center justify-end gap-0.5 -my-1">
            <Button
              label={t('leave.approve')}
              variant="ghost"
              size="sm"
              className="px-2"
              onClick={() => handleApprove(leave.leaveRequestId)}
              loading={isApproving}
            />
            <Button
              label={t('leave.reject')}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50 px-2"
              onClick={() => handleReject(leave.leaveRequestId)}
              loading={isRejecting}
            />
          </div>
        ) : (
          <StatusLabel statusCode={leave.status} />
        ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-end shrink-0">
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

          <Input
            value={keyword}
            onChange={handleKeywordChange}
            icon="ri-search-line"
            placeholder={t('common.searchName')}
          />
        </div>
      </div>
      {isLoading ? (
        <TableStatusBox type="loading" message={t('leave.loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('leave.loadError')} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={leaveList}
          keyExtractor={(row) => row.leaveRequestId}
          emptyMessage={t('leave.empty')}
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
