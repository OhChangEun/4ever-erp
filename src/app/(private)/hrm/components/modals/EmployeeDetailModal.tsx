import { type EmployeeData } from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import { type ModalProps } from '@/app/components/common/modal/types';

import { Button } from '@everp/ui';
interface EmployeeDetailModalProps extends ModalProps {
  employee: EmployeeData;
  onEdit: () => void;
}

export function EmployeeDetailModal({ employee, onEdit }: EmployeeDetailModalProps) {
  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <div className="text-sm text-gray-900">{employee.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <div className="text-sm text-gray-900">{employee.department}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
            <div className="text-sm text-gray-900">{employee.position}</div>
          </div>
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
        <Button label="수정" size="sm" onClick={onEdit} />
      </div>
    </>
  );
}
