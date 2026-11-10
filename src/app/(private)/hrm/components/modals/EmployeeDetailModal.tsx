import { type EmployeeData } from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useTranslations } from 'next-intl';

import { Button } from '@everp/ui';
interface EmployeeDetailModalProps extends ModalProps {
  employee: EmployeeData;
  onEdit: () => void;
}

export function EmployeeDetailModal({ employee, onEdit }: EmployeeDetailModalProps) {
  const t = useTranslations('hrm');
  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.name')}
            </label>
            <div className="text-sm text-gray-900">{employee.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.department')}
            </label>
            <div className="text-sm text-gray-900">{employee.department}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.position')}
            </label>
            <div className="text-sm text-gray-900">{employee.position}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.hireDate')}
            </label>
            <div className="text-sm text-gray-900">{employee.hireDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.birthDate')}
            </label>
            <div className="text-sm text-gray-900">{employee.birthDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.phone')}
            </label>
            <div className="text-sm text-gray-900">{employee.phone}</div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.email')}
          </label>
          <div className="text-sm text-gray-900">{employee.email}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.address')}
          </label>
          <div className="text-sm text-gray-900">{employee.address}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button label={t('common.edit')} size="sm" onClick={onEdit} />
      </div>
    </>
  );
}
