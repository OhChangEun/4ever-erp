'use client';

import { fetchDepartmentsDropdown, fetchTrainingList } from '@/app/(private)/hrm/api/hrm.api';
import {
  TrainingListData,
  TrainingRequestParams,
} from '@/app/(private)/hrm/types/HrmTrainingApiType';
import Dropdown from '@/app/components/common/Dropdown';
import { useModal } from '@/app/components/common/modal/useModal';
import Pagination from '@/app/components/common/Pagination';
import { useQuery } from '@tanstack/react-query';
import React, { useState, useMemo } from 'react';
import TrainingDetailModal from '@/app/(private)/hrm/components/modals/TrainingDetailModal';
import AddEmployeeTrainingModal from '@/app/(private)/hrm/components/modals/AddEmployeeTrainingModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import Input from '@/app/components/common/Input';
import { useDebouncedKeyword } from '@/app/hooks/useDebouncedKeyword';
import Table, { TableColumn } from '@/app/components/common/Table';

export default function EmployeeTrainingTab() {
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

  const {
    data: trainingData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['trainingList', trainingQueryParams],
    queryFn: () => fetchTrainingList(trainingQueryParams),
  });

  const trainingList = trainingData?.items ?? [];
  const pageInfo = trainingData?.page;

  type TrainingItem = (typeof trainingList)[0];
  const columns: TableColumn<TrainingItem>[] = [
    {
      key: 'name',
      label: '직원 정보',
      render: (_, t) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{t.name}</div>
          <div className="text-sm text-gray-500">
            {t.department} · {t.position}
          </div>
        </div>
      ),
    },
    {
      key: 'completedCount',
      label: '완료된 교육',
      align: 'center',
      render: (_, t) => (
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-green-600">{t.completedCount}</span>
          <span className="text-sm text-gray-500 ml-1">개</span>
        </div>
      ),
    },
    {
      key: 'requiredMissingCount',
      label: '필수 교육',
      align: 'center',
      render: (_, t) => (
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-red-600">{t.requiredMissingCount}</span>
          <span className="text-sm text-gray-500 ml-1">개 미완료</span>
        </div>
      ),
    },
    {
      key: 'lastTrainingDate',
      label: '최근 교육일',
      render: (_, t) => t.lastTrainingDate?.split('T')[0] ?? '-',
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, t) => (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleViewTrainingDetail(t)}
            className="text-blue-600 hover:text-blue-900 cursor-pointer"
            title="교육 상세보기"
          >
            <i className="ri-eye-line"></i>
          </button>
          <button
            onClick={() =>
              handleViewAddEmployeeTraining({
                employeeId: t.employeeId,
                employeeName: t.name,
              })
            }
            className="text-green-600 hover:text-green-900 cursor-pointer"
            title="교육 추가"
          >
            <i className="ri-add-line"></i>
          </button>
        </div>
      ),
    },
  ];

  const handleViewTrainingDetail = (training: TrainingItem) => {
    openModal(TrainingDetailModal, {
      title: `${training.name}의 교육현황`,
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
      title: `${employeeName}에게 교육 추가`,
      employeeId: employeeId,
    });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 필터링 및 검색 */}
      <div className="flex items-center justify-end gap-3 shrink-0">
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

      <Table
        columns={columns}
        data={trainingList}
        keyExtractor={(row) => row.employeeId}
        emptyMessage="교육 기록이 없습니다."
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
