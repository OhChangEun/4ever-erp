'use client';

import { Button } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchProgramListDropdown, fetchTrainingDetail } from '@/app/(private)/hrm/api/hrm.api';
import { Dropdown } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useAssignProgramToEmployee } from '@/app/(private)/hrm/api/hrm.mutations';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { programKeys, trainingKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { toKeyValueItems } from '@/lib/api/options';

interface AddEmployeeTrainingModalProps extends ModalProps {
  employeeId: string;
}

export default function AddEmployeeTrainingModal({
  employeeId,
  onClose,
}: AddEmployeeTrainingModalProps) {
  const t = useTranslations('hrm');
  const [selection, setSelection] = useState('');

  const errorMessageOf = useErrorMessage();
  const toast = useToast();

  // 교육 프로그램 드롭다운 조회
  const { data: programData } = useQuery({
    queryKey: programKeys.dropdown(),
    queryFn: fetchProgramListDropdown,
    select: toKeyValueItems,
    staleTime: Infinity,
  });

  // 그 직원이 이미 받은 프로그램. 교육 현황 상세와 같은 조회(지정 mutation 이 이 키를 무효화한다)
  const {
    data: assignedProgramIds,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: trainingKeys.detail(employeeId),
    queryFn: () => fetchTrainingDetail(employeeId),
    enabled: !!employeeId,
    select: (detail) => detail.programHistory.map((record) => record.programId),
  });

  // 이력을 받기 전이나 다시 받기가 실패했으면(캐시에 옛 이력이 남는다) 고를 것이 없다.
  // 받은 뒤에는 이력에 있는 프로그램(완료든 미완료든)을 뺀다
  const historyReady = !!assignedProgramIds && !isHistoryError;
  const assignablePrograms = historyReady
    ? (programData ?? []).filter((program) => !assignedProgramIds.includes(program.key))
    : [];
  // 고른 프로그램이 다시 받은 이력에 들어가면 선택에서 빠진다
  const selectedProgram = assignablePrograms.some((program) => program.key === selection)
    ? selection
    : '';

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
      return;
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
          items={assignablePrograms}
          value={selectedProgram}
          onChange={setSelection}
          disabled={!historyReady}
        />
        {isHistoryError && (
          <div className="mt-1 flex items-center gap-2 text-sm text-red-600">
            <span>{t('common.loadFailed')}</span>
            <Button
              label={t('common.retry')}
              variant="ghost"
              size="sm"
              onClick={() => void refetchHistory()}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          label={t('training.submitAdd')}
          loading={mutation.isPending}
          disabled={!historyReady}
        />
      </div>
    </form>
  );
}
