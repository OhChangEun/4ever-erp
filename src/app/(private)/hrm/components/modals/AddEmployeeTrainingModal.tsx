'use client';

import { Button } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useQuery } from '@tanstack/react-query';
import React, { type FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchProgramListDropdown } from '@/app/(private)/hrm/api/hrm.api';
import { Dropdown } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useAssignProgramToEmployee } from '@/app/(private)/hrm/api/hrm.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { programKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { toKeyValueItems } from '@/lib/api/options';

interface AddEmployeeTrainingModalProps extends ModalProps {
  employeeId: string;
}

export default function AddEmployeeTrainingModal({
  employeeId,
  onClose,
}: AddEmployeeTrainingModalProps) {
  const t = useTranslations('hrm');
  const [selectedProgram, setSelectedProgram] = useState('');

  const toast = useToast();

  // 교육 프로그램 드롭다운 조회
  const { data: programData } = useQuery({
    queryKey: programKeys.dropdown(),
    queryFn: fetchProgramListDropdown,
    select: toKeyValueItems,
    staleTime: Infinity,
  });

  // mutation 설정
  const mutation = useAssignProgramToEmployee({
    onSuccess: () => {
      onClose();
      toast.info(t('training.assigned'));
    },
    onError: (error) => toast.error(t('training.assignError', { message: errorMessageOf(error) })),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedProgram) {
      toast.warning(t('training.selectProgramWarning'));
    }

    mutation.mutate({ employeeId, programId: selectedProgram });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 교육 프로그램 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('training.selectProgramLabel')}
        </label>
        <Dropdown
          placeholder={t('training.selectProgram')}
          items={programData ?? []}
          value={selectedProgram}
          onChange={setSelectedProgram}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" label={t('training.submitAdd')} loading={mutation.isPending} />
      </div>
    </form>
  );
}
