import { EmployeeData, EmployeeUpdateRequest } from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import IconButton from '@/app/components/common/IconButton';
import { ModalProps } from '@/app/components/common/modal/types';
import { useModal } from '@/app/components/common/modal/useModal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { fetchDepartmentsDropdown, fetchPositionsDropdown, putEmployee } from '../../api/hrm.api';
import { KeyValueItem } from '@/app/types/CommonType';
import Dropdown from '@/app/components/common/Dropdown';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useToast } from '@/app/components/common/toast/useToast';

interface EmployeeEditModalProps extends ModalProps {
  employee: EmployeeData;
}

export function EmployeeEditModal({ employee }: EmployeeEditModalProps) {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');

  const { removeAllModals } = useModal();
  const toast = useToast();
  const queryClient = useQueryClient();

  // 부서 드롭다운
  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'include',
  );

  const {
    data: positionData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['positionsDropdown', selectedDepartment],
    queryFn: () => fetchPositionsDropdown(selectedDepartment),
    enabled: !!selectedDepartment,
  });

  // mutation 설정
  const mutation = useMutation({
    mutationFn: (data: EmployeeUpdateRequest) => putEmployee(employee.employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeesList'] });

      removeAllModals();
      toast.success('고객정보가 수정되었습니다.');
    },
    onError: (error) => {
      console.error('직원 정보 수정 실패: ', error);
      toast.error('직원 정보 수정에 실패했습니다. 다시 시도해주세요.');
    },
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
    mutation.mutate(requestBodyData);
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
        <IconButton label="저장" size="sm" icon="ri-save-line" onClick={handleSave} />
      </div>
    </>
  );
}
