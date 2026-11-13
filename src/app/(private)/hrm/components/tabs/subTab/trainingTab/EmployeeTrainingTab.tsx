'use client';

import { fetchDepartmentsDropdown, fetchTrainingList } from '@/app/(private)/hrm/api/hrm.api';
import { type TrainingRequestParams } from '@/app/(private)/hrm/types/HrmTrainingApiType';
import { Dropdown } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { Pagination } from '@everp/ui';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import TrainingDetailModal from '@/app/(private)/hrm/components/modals/TrainingDetailModal';
import AddEmployeeTrainingModal from '@/app/(private)/hrm/components/modals/AddEmployeeTrainingModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import { Input } from '@everp/ui';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import { Table, type TableColumn } from '@everp/ui';
import { trainingKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { Button } from '@everp/ui';
export default function EmployeeTrainingTab() {
  const t = useTranslations('hrm');
  // --- 모달 출력 ---
  const { openModal } = useModal();
  const { keyword, handleKeywordChange, debouncedKeyword } = useDebouncedKeyword();

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

  const trainingQueryParams = useMemo(
    (): TrainingRequestParams => ({
      department: selectedDepartment || undefined,
      name: debouncedKeyword,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedDepartment, debouncedKeyword, currentPage],
  );

  const { data: trainingData, isPlaceholderData: isPlaceholderData } = useQuery({
    queryKey: trainingKeys.list(trainingQueryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchTrainingList(trainingQueryParams),
  });

  const trainingList = trainingData?.items ?? [];
  const pageInfo = trainingData?.page;

  type TrainingItem = (typeof trainingList)[0];
  const columns: TableColumn<TrainingItem>[] = [
    {
      key: 'name',
      label: t('common.employee'),
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">
            {row.department} · {row.position}
          </div>
        </div>
      ),
    },
    {
      key: 'completedCount',
      label: t('training.completed'),
      render: (_, row) => (
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-green-600">{row.completedCount}</span>
          <span className="text-sm text-gray-500 ml-1">
            {t('training.completedUnit', { count: row.completedCount })}
          </span>
        </div>
      ),
    },
    {
      key: 'requiredMissingCount',
      label: t('training.required'),
      render: (_, row) => (
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-red-600">{row.requiredMissingCount}</span>
          <span className="text-sm text-gray-500 ml-1">{t('training.missingUnit')}</span>
        </div>
      ),
    },
    {
      key: 'lastTrainingDate',
      label: t('training.lastDate'),
      render: (_, row) => row.lastTrainingDate?.split('T')[0] ?? '-',
    },
    {
      key: 'action',
      label: t('common.actions'),
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-0.5 -my-1">
          <Button
            label={t('common.detail')}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100 px-2"
            onClick={() => handleViewTrainingDetail(row)}
          />
          <Button
            label={t('training.add')}
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() =>
              handleViewAddEmployeeTraining({
                employeeId: row.employeeId,
                employeeName: row.name,
              })
            }
          />
        </div>
      ),
    },
  ];

  const handleViewTrainingDetail = (training: TrainingItem) => {
    openModal(TrainingDetailModal, {
      title: t('training.detailTitle', { name: training.name }),
      employeeId: training.employeeId,
    });
  };

  const handleViewAddEmployeeTraining = ({
    employeeId,
    employeeName,
  }: {
    employeeId: string;
    employeeName: string;
  }) => {
    openModal(AddEmployeeTrainingModal, {
      title: t('training.addTitle', { name: employeeName }),
      employeeId: employeeId,
    });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 필터링 및 검색 */}
      <div className="flex items-center justify-end gap-3 shrink-0">
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

      <Table
        isStale={isPlaceholderData}
        columns={columns}
        data={trainingList}
        keyExtractor={(row) => row.employeeId}
        emptyMessage={t('training.empty')}
        className="flex-1 min-h-0"
      />
      <Pagination
        currentPage={currentPage}
        totalPages={pageInfo?.totalPages ?? 1}
        totalElements={pageInfo?.totalElements}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
