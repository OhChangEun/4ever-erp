'use client';

import { Button } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState, useId } from 'react';
import { useTranslations } from 'next-intl';
import { fetchProgramStatusDropdown } from '@/app/(private)/hrm/api/hrm.api';
import { type UpdateProgramRequest } from '@/app/(private)/hrm/types/HrmProgramApiType';
import { Dropdown } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useUpdateProgram } from '@/app/(private)/hrm/api/hrm.mutations';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { programKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { toKeyValueItems } from '@/lib/api/options';

interface EditProgramModalProps extends ModalProps {
  programId: string;
  programName: string;
  /** 지금 상태. 서버가 statusCode 를 필수로 받아 안 고르면 이 값을 그대로 보낸다 */
  statusCode: string;
}

export default function EditProgramModal({
  programId,
  programName,
  statusCode,
  onClose,
}: EditProgramModalProps) {
  const t = useTranslations('hrm');
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const [selectedProgramStatus, setSelectedProgramStatus] = useState(statusCode);

  const { data: statusData } = useQuery({
    queryKey: programKeys.statusDropdown(),
    queryFn: fetchProgramStatusDropdown,
    select: toKeyValueItems,
    staleTime: Infinity,
  });
  const errorMessageOf = useErrorMessage();
  const toast = useToast();

  const [editedName, setEditedName] = useState(programName);

  // mutation 설정
  const mutation = useUpdateProgram({
    onSuccess: () => {
      onClose();
      toast.success(t('programs.updated'));
    },
    onError: (error) => toast.error(t('programs.updateError', { message: errorMessageOf(error) })),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editedName.trim()) {
      toast.warning(t('programs.nameRequired'));
      return;
    }

    const updateData: UpdateProgramRequest = {
      programId,
      programName: editedName.trim(),
      statusCode: selectedProgramStatus,
    };

    mutation.mutate(updateData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 교육명 */}
      <div>
        <label
          htmlFor={`${fieldId}-field0`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t('programs.name')}
        </label>
        <input
          id={`${fieldId}-field0`}
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          placeholder={t('programs.namePlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 상태 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
        <Dropdown
          placeholder={t('programs.statusPlaceholder')}
          items={statusData ?? []}
          value={selectedProgramStatus}
          onChange={setSelectedProgramStatus}
        />
      </div>

      {/* 버튼 */}
      <div className="flex justify-end">
        <Button type="submit" label={t('common.edit')} loading={mutation.isPending} />
      </div>
    </form>
  );
}
