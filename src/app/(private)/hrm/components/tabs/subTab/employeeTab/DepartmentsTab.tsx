import { fetchDepartmentsList } from '@/app/(private)/hrm/api/hrm.api';
import { type DepartmentsData } from '@/app/(private)/hrm/types/HrmDepartmentsApiType';
import { useModal } from '@/app/components/common/modal/useModal';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useTranslations } from 'next-intl';
import { DepartmentDetailModal } from '../../../modals/DepartmentDetailModal';
import { DepartmentEditModal } from '../../../modals/DepartmentEditModal';
import { departmentKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { Button } from '@everp/ui';
export default function DepartmentsTab() {
  const t = useTranslations('hrm');
  const { openModal, removeAllModals } = useModal();

  // 부서 데이터
  const { data: departmentsData } = useQuery({
    queryKey: departmentKeys.lists(),
    queryFn: fetchDepartmentsList,
    staleTime: Infinity,
  });

  const departmentList = departmentsData?.content ?? [];

  // 부서 상세보기 모달창
  const handleViewDepartment = (dept: DepartmentsData) => {
    openModal(DepartmentDetailModal, {
      title: t('departments.detailTitle'),
      departments: dept,
      onEdit: () => handleEditDepartmentDetail(dept),
      width: '600px',
    });
  };

  // 부서 수정 모달창
  const handleEditDepartmentDetail = (dept: DepartmentsData) => {
    removeAllModals();
    openModal(DepartmentEditModal, { title: t('departments.editTitle'), departments: dept });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('departments.title')}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departmentList.map((dept) => (
          <div key={dept.departmentId} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">{dept.departmentName}</h4>
              <Button
                label={t('common.detail')}
                size="sm"
                variant="ghost"
                onClick={() => handleViewDepartment(dept)}
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('departments.headcount')}</span>
                <span className="text-sm font-medium text-gray-700">
                  {t('common.people', { count: dept.employeeCount })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('departments.manager')}</span>
                <span className="text-sm font-medium text-gray-700">{dept.managerName ?? '-'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
