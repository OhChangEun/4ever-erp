// tabs/AttendanceTab.tsx
'use client';
import {
  fetchAttendanceList,
  fetchAttendanceStatusDropdown,
  fetchDepartmentsDropdown,
} from '@/app/(private)/hrm/api/hrm.api';
import { type AttendanceRequestParams } from '@/app/(private)/hrm/types/HrmAttendanceApiType';
import { Dropdown } from '@everp/ui';
import { Pagination } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Table, type TableColumn } from '@everp/ui';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { formatTime } from '@/app/utils/date';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import { Input } from '@everp/ui';
import CalendarButton from '@/app/components/common/CalendarButton';
import StatusLabel from '@/app/components/common/StatusLabel';
import { attendanceKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { toKeyValueItems } from '@/lib/api/options';
import { toDateKey } from '@/app/utils/date';
import AttendanceHeatmap from '@/app/(private)/hrm/components/heatmap/AttendanceHeatmap';

export default function AttendanceTab() {
  const t = useTranslations('hrm');
  // 분 → "8시간 30분"(en: 8h 30m). 예전 글자는 "8시 30분"(시각처럼 읽혀 고침)
  const duration = (minutes: number | null | undefined) =>
    minutes == null
      ? '-'
      : t('attendance.duration', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  // --- 모달 출력 ---

  const { keyword, handleKeywordChange, debouncedKeyword } = useDebouncedKeyword();

  // --- 드롭다운 ---
  // 부서 드롭다운
  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'with-all',
  );

  const { data: statusData } = useQuery({
    queryKey: attendanceKeys.statusDropdown(),
    queryFn: fetchAttendanceStatusDropdown,
    select: toKeyValueItems,
    staleTime: Infinity,
  });

  // --- 선택된 드롭다운 상태 ---
  const [selectedDepartment, setSelectedDepartment] = useState(''); // 부서
  const [selectedStatus, setSelectedStatus] = useState(''); // 출결 상태

  // --- 페이지 네이션 ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // --- 달력 데이터 ---
  const today = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  const attendanceQueryParams = useMemo(
    (): AttendanceRequestParams => ({
      date: selectedDate ?? '',
      department: selectedDepartment || undefined,
      statusCode: selectedStatus || undefined,
      name: debouncedKeyword,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedDate, selectedDepartment, selectedStatus, debouncedKeyword, currentPage],
  );

  const {
    data: attendanceData,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: attendanceKeys.list(attendanceQueryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchAttendanceList(attendanceQueryParams),
  });

  const attendanceList = attendanceData?.content ?? [];
  const pageInfo = attendanceData?.page;

  type AttendanceItem = (typeof attendanceList)[0];

  const columns: TableColumn<AttendanceItem>[] = [
    {
      key: 'employee',
      label: t('common.employee'),
      render: (_, attend) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {attend.employee.employeeName || '-'}
          </div>
          <div className="text-sm text-gray-500">{attend.employee.position || '-'}</div>
        </div>
      ),
    },
    {
      key: 'checkInTime',
      label: t('attendance.checkIn'),
      render: (_, attend) => formatTime(attend.checkInTime),
    },
    {
      key: 'checkOutTime',
      label: t('attendance.checkOut'),
      render: (_, attend) => formatTime(attend.checkOutTime),
    },
    {
      key: 'totalWorkMinutes',
      label: t('attendance.workTime'),
      render: (_, attend) => duration(attend.totalWorkMinutes),
    },
    {
      key: 'overtimeMinutes',
      label: t('attendance.overtime'),
      render: (_, attend) => duration(attend.overtimeMinutes),
    },
    {
      key: 'statusCode',
      label: t('common.status'),
      render: (_, attend) => <StatusLabel statusCode={attend.statusCode} />,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <AttendanceHeatmap
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setCurrentPage(1);
        }}
      />
      <div className="flex justify-between items-center shrink-0">
        <CalendarButton
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          placeholder={t('attendance.selectDate')}
        />

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
            items={statusData ?? []}
            value={selectedStatus}
            onChange={(status: string) => {
              setSelectedStatus(status);
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
        <TableStatusBox type="loading" message={t('attendance.loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('attendance.loadError')} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={attendanceList}
          keyExtractor={(row) => row.timerecordId}
          emptyMessage={t('attendance.empty')}
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
