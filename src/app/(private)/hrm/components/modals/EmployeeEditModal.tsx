import {
  type EmployeeData,
  type EmployeeUpdateRequest,
} from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useModal } from '@/app/components/common/modal/useModal';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchDepartmentsDropdown, fetchPositionsDropdown } from '../../api/hrm.api';
import { Dropdown } from '@everp/ui';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useToast } from '@/app/components/common/toast/useToast';
import { useUpdateEmployee } from '@/app/(private)/hrm/api/hrm.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { positionKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { Button } from '@everp/ui';
import { toKeyValueItems } from '@/lib/api/options';
interface EmployeeEditModalProps extends ModalProps {
  employee: EmployeeData;
}

export function EmployeeEditModal({ employee }: EmployeeEditModalProps) {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');

  const { removeAllModals } = useModal();
  const toast = useToast();

  // 부서 드롭다운
  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'with-all',
  );

  const { data: positionData } = useQuery({
    queryKey: positionKeys.dropdown(selectedDepartment),
    queryFn: () => fetchPositionsDropdown(selectedDepartment),
    select: toKeyValueItems,
    enabled: !!selectedDepartment,
  });

  // mutation 설정
  const mutation = useUpdateEmployee({
    onSuccess: () => {
      removeAllModals();
      toast.success('직원 정보가 수정되었습니다.');
    },
    onError: (error) => toast.error(`직원 정보 수정에 실패했습니다. ${errorMessageOf(error)}`),
  });

  const handleSave = () => {
    if (!selectedDepartment || !selectedPosition) {
      toast.warning('부서와 직급을 모두 입력해주세요.');
      return;
    }

    const requestBodyData: EmployeeUpdateRequest = {
      employeeName: employee.name,
      departmentId: selectedDepartment,
      positionId: selectedPosition,
    };

    // mutation 호출
    mutation.mutate({ employeeId: employee.employeeId, body: requestBodyData });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <div className="text-sm text-gray-900">{employee.name}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <div>
            <label className="block pl-1 text-sm font-medium text-gray-700 mb-1">부서</label>
            <Dropdown
              items={departmentsOptions}
              value={selectedDepartment}
              onChange={(dept: string) => {
                setSelectedDepartment(dept);
                setSelectedPosition('');
              }}
              placeholder="부서 선택"
            />
          </div>

          {selectedDepartment && (
            <div className="fade-in">
              <label className="block pl-1 text-sm font-medium text-gray-700 mb-1">직급</label>
              <Dropdown
                items={positionData ?? []}
                value={selectedPosition}
                onChange={setSelectedPosition}
                placeholder="직급 선택"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
            <div className="text-sm text-gray-900">{employee.hireDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
            <div className="text-sm text-gray-900">{employee.birthDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
            <div className="text-sm text-gray-900">{employee.phone}</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <div className="text-sm text-gray-900">{employee.email}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
          <div className="text-sm text-gray-900">{employee.address}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button label="저장" size="sm" onClick={handleSave} loading={mutation.isPending} />
      </div>
    </>
  );
}
