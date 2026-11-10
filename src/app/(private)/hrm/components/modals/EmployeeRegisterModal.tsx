'use client';

import { type ModalProps } from '@/app/components/common/modal/types';
import { Button } from '@everp/ui';
import { Dropdown } from '@everp/ui';
import { Input } from '@everp/ui';
import CalendarButton from '@/app/components/common/CalendarButton';
import { LoadingMessage } from '@everp/ui';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { fetchDepartmentsDropdown, fetchPositionsDropdown } from '@/app/(private)/hrm/api/hrm.api';
import { type EmployeeRegisterRequest } from '../../types/HrmEmployeesApiType';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useToast } from '@/app/components/common/toast/useToast';
import { useRegisterEmployee } from '@/app/(private)/hrm/api/hrm.mutations';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { positionKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { toKeyValueItems } from '@/lib/api/options';

export default function EmployeeRegisterModal({ onClose }: ModalProps) {
  const t = useTranslations('hrm');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [formData, setFormData] = useState<EmployeeRegisterRequest>({
    name: '',
    departmentId: '',
    positionId: '',
    email: '',
    phoneNumber: '',
    hireDate: '',
    birthDate: '',
    baseAddress: '',
    detailAddress: '',
  });

  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'without-all',
  );
  const errorMessageOf = useErrorMessage();
  const toast = useToast();

  const { data: positionData, isLoading: isPositionLoading } = useQuery({
    queryKey: positionKeys.dropdown(selectedDepartment),
    queryFn: () => fetchPositionsDropdown(selectedDepartment),
    select: toKeyValueItems,
    enabled: !!selectedDepartment,
  });

  const { mutate: registerEmployee, isPending: isRegistering } = useRegisterEmployee({
    onSuccess: () => {
      toast.success(t('employees.registered'));
      setFormData({
        name: '',
        departmentId: '',
        positionId: '',
        email: '',
        phoneNumber: '',
        hireDate: '',
        birthDate: '',
        baseAddress: '',
        detailAddress: '',
      });

      onClose();
    },
    onError: (error) =>
      toast.error(t('employees.registerError', { message: errorMessageOf(error) })),
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requestBody: EmployeeRegisterRequest = {
      ...formData,
      departmentId: selectedDepartment,
      positionId: selectedPosition,
    };
    registerEmployee(requestBody);
  };

  // 로딩 표시
  if (isRegistering || isPositionLoading) return <LoadingMessage />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('common.email')}
          type="email"
          name="email"
          placeholder="hong@company.com"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <Input
          label={t('common.name')}
          type="text"
          name="name"
          placeholder={t('employees.placeholders.name')}
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block pl-1 text-sm font-medium text-gray-700 mb-1">
            {t('common.department')}
          </label>
          <Dropdown
            items={departmentsOptions}
            value={selectedDepartment}
            onChange={(dept: string) => {
              setSelectedDepartment(dept);
              setSelectedPosition('');
            }}
            placeholder={t('common.selectDepartment')}
          />
        </div>
        {selectedDepartment && (
          <div className="flex-1 fade-in">
            <label className="block pl-1 text-sm font-medium text-gray-700 mb-1">
              {t('common.position')}
            </label>
            <Dropdown
              items={positionData ?? []}
              value={selectedPosition}
              onChange={setSelectedPosition}
              placeholder={t('common.selectPosition')}
            />
          </div>
        )}
      </div>

      <Input
        label={t('common.phone')}
        type="tel"
        name="phoneNumber"
        placeholder="010-1234-5678"
        value={formData.phoneNumber}
        onChange={handleChange}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.hireDate')}
          </label>
          <CalendarButton
            selectedDate={formData.hireDate}
            onDateChange={(date) => setFormData((prev) => ({ ...prev, hireDate: date || '' }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.birthDate')}
          </label>
          <CalendarButton
            maxDate={new Date()}
            selectedDate={formData.birthDate}
            onDateChange={(date) => setFormData((prev) => ({ ...prev, birthDate: date || '' }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('common.address')}
          type="text"
          name="baseAddress"
          placeholder={t('employees.placeholders.address')}
          value={formData.baseAddress}
          onChange={handleChange}
        />
        <Input
          label={t('employees.detailAddress')}
          type="text"
          name="detailAddress"
          placeholder={t('employees.placeholders.detailAddress')}
          value={formData.detailAddress}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" label={t('employees.submitRegister')} />
      </div>
    </form>
  );
}
