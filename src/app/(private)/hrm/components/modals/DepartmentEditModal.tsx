'use client';

import { ModalProps } from '@/app/components/common/modal/types';
import {
  DepartmentsData,
  DepartmentsRequestBody,
} from '@/app/(private)/hrm/types/HrmDepartmentsApiType';
import IconButton from '@/app/components/common/IconButton';
import { useState } from 'react';
import { useModal } from '@/app/components/common/modal/useModal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDeptMemberDropdown, patchDepartments } from '@/app/(private)/hrm/api/hrm.api';
import Dropdown from '@/app/components/common/Dropdown';
import LoadingMessage from '@/app/components/common/LoadingMessage';
import { useToast } from '@/app/components/common/toast/useToast';

interface DepartmentEditModalProps extends ModalProps {
  departments: DepartmentsData;
}

export function DepartmentEditModal({ departments }: DepartmentEditModalProps) {
  const { removeAllModals } = useModal();
  const toast = useToast();
  const queryClient = useQueryClient();

  // 선택된 부서장 상태
  const [selectedManager, setSelectedManager] = useState<string>(departments.managerId);
  const [description, setDescription] = useState<string>(departments.description);

  const {
    data: memberOptions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['deptMemberDropdown', departments.departmentId],
    queryFn: () => fetchDeptMemberDropdown(departments.departmentId),
  });

  const { mutate: updateDepartments, isPending } = useMutation({
    mutationFn: (body: DepartmentsRequestBody) => patchDepartments(departments.departmentId, body),
    onSuccess: () => {
      // 성공 시 캐시 갱신
      queryClient.invalidateQueries({ queryKey: ['departmentsList'] });
      toast.success('부서 정보가 수정되었습니다.');
      removeAllModals();
    },
    onError: (error) => {
      toast.error('수정 중 오류가 발생했습니다.');
      console.error(error);
    },
  });

  const handleSave = () => {
    const data: DepartmentsRequestBody = {
      managerId: selectedManager,
      description: description,
    };

    updateDepartments(data);
  };

  if (isPending) {
    return <LoadingMessage message="부서 정보 수정하는중..." />;
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">부서명</label>
          <input
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
          <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-6 border-t border-gray-200">
        <IconButton label="저장" size="sm" icon="ri-save-line" onClick={handleSave} />
      </div>
    </>
  );
}
