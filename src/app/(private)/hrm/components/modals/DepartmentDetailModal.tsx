import { type ModalProps } from '@/app/components/common/modal/types';
import { type DepartmentsData } from '@/app/(private)/hrm/types/HrmDepartmentsApiType';
import { Button } from '@everp/ui';
interface DepartmentDetailModalProps extends ModalProps {
  departments: DepartmentsData;
  onEdit: () => void;
}

export function DepartmentDetailModal({ departments, onEdit }: DepartmentDetailModalProps) {
  return (
    <>
      <div className="space-y-4">
        {/* 부서 기본 정보 */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">부서 정보</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">부서장</label>
              <div className="text-sm text-gray-900">{departments.managerName || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">인원 수</label>
              <div className="text-sm text-gray-900">{departments.employeeCount}명</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">위치</label>
              <div className="text-sm text-gray-900">{departments.location || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">설립일</label>
              <div className="text-sm text-gray-900">{departments.establishedDate || '-'}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">설명</label>
            <div className="text-sm text-gray-900 leading-relaxed">
              {departments.description || '설명이 없습니다.'}
            </div>
          </div>
        </div>

        {/* 소속 직원 목록 */}
        {departments.employees && departments.employees.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              소속 직원 ({departments.employees.length}명)
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {departments.employees.map((employee) => (
                <div key={employee.employeeId} className="bg-white rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.employeeName}
                        <span className="pl-2 text-xs text-gray-400 mt-0.5">
                          {employee.position}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">입사일</span>
                    <span className="text-gray-900">{employee.hireDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 mt-6 border-t border-gray-200">
        <Button label="수정" size="sm" onClick={onEdit} />
      </div>
    </>
  );
}
