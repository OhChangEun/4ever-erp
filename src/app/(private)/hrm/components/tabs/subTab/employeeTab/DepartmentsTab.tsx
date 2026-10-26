import { fetchDepartmentsList } from '@/app/(private)/hrm/api/hrm.api';
import { DepartmentsData } from '@/app/(private)/hrm/types/HrmDepartmentsApiType';
import { useModal } from '@/app/components/common/modal/useModal';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { DepartmentDetailModal } from '../../../modals/DepartmentDetailModal';
import { DepartmentEditModal } from '../../../modals/DepartmentEditModal';
import IconButton from '@/app/components/common/IconButton';
import { departmentKeys } from '@/app/(private)/hrm/api/hrm.keys';

export default function DepartmentsTab() {
  const { openModal, removeAllModals } = useModal();

  // 부서 데이터
  const {
    data: departmentsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: departmentKeys.lists(),
    queryFn: fetchDepartmentsList,
    staleTime: Infinity,
  });

  const departmentList = departmentsData?.content ?? [];

  // 부서 상세보기 모달창
  const handleViewDepartment = (dept: DepartmentsData) => {
    openModal(DepartmentDetailModal, {
      title: '부서 상세보기',
      departments: dept,
      onEdit: () => handleEditDepartmentDetail(dept),
      width: '600px',
    });
  };

  // 부서 수정 모달창
  const handleEditDepartmentDetail = (dept: DepartmentsData) => {
    removeAllModals();
    openModal(DepartmentEditModal, { title: '부서정보 수정', departments: dept });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">부서별 조직 구조</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departmentList.map((dept) => (
          <div key={dept.departmentId} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">{dept.departmentName}팀</h4>
              <IconButton
                icon="ri-eye-line"
                size="sm"
                variant="ghost"
                onClick={() => handleViewDepartment(dept)}
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">인원 수</span>
                <span className="text-sm font-medium text-gray-700">{dept.employeeCount}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">부서장</span>
                <span className="text-sm font-medium text-gray-700">{dept.managerName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
