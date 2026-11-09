'use client';

import { ModalProps } from '@/app/components/common/modal/types';
import {
  DepartmentsData,
  DepartmentsRequestBody,
} from '@/app/(private)/hrm/types/HrmDepartmentsApiType';
import { useState, useId } from 'react';
import { useModal } from '@/app/components/common/modal/useModal';
import { useQuery } from '@tanstack/react-query';
import { fetchDeptMemberDropdown } from '@/app/(private)/hrm/api/hrm.api';
import { Dropdown } from '@everp/ui';
import { LoadingMessage } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useUpdateDepartment } from '@/app/(private)/hrm/api/hrm.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { departmentKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { Button } from '@everp/ui';
import { toKeyValueItems } from '@/lib/api/options';
interface DepartmentEditModalProps extends ModalProps {
  departments: DepartmentsData;
}

export function DepartmentEditModal({ departments }: DepartmentEditModalProps) {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const { removeAllModals } = useModal();
  const toast = useToast();

  // 선택된 부서장 상태
  const [selectedManager, setSelectedManager] = useState<string>(departments.managerId);
  const [description, setDescription] = useState<string>(departments.description);

  const { data: memberOptions } = useQuery({
    queryKey: departmentKeys.memberDropdown(departments.departmentId),
    queryFn: () => fetchDeptMemberDropdown(departments.departmentId),
    select: toKeyValueItems,
  });

  const { mutate: updateDepartments, isPending } = useUpdateDepartment({
    onSuccess: () => {
      toast.success('부서 정보가 수정되었습니다.');
      removeAllModals();
    },
    onError: (error) => toast.error(`수정 중 오류가 발생했습니다. ${errorMessageOf(error)}`),
  });

  const handleSave = () => {
    const data: DepartmentsRequestBody = {
      managerId: selectedManager,
      description: description,
    };

    updateDepartments({ departmentId: departments.departmentId, body: data });
  };

  if (isPending) {
    return <LoadingMessage message="부서 정보 수정하는중..." />;
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <label
            htmlFor={`${fieldId}-field0`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            부서명
          </label>
          <input
            id={`${fieldId}-field0`}
            type="text"
            required
            defaultValue={departments.departmentName + '팀'}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">부서장</label>
          <Dropdown
            items={memberOptions ?? []}
            value={selectedManager}
            onChange={(value) => setSelectedManager(value)}
            placeholder={departments.managerName}
          />
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-field1`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            설명
          </label>
          <textarea
            id={`${fieldId}-field1`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-6 border-t border-gray-200">
        <Button label="저장" size="sm" onClick={handleSave} />
      </div>
    </>
  );
}
