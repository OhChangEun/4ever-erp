'use client';

import { Button } from '@everp/ui';
import { ModalProps } from '@/app/components/common/modal/types';
import { useQuery } from '@tanstack/react-query';
import React, { FormEvent, useState, useId } from 'react';
import { fetchProgramStatusDropdown } from '@/app/(private)/hrm/api/hrm.api';
import { UpdateProgramRequest } from '@/app/(private)/hrm/types/HrmProgramApiType';
import { Dropdown } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useUpdateProgram } from '@/app/(private)/hrm/api/hrm.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { programKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { toKeyValueItems } from '@/lib/api/options';

interface EditProgramModalProps extends ModalProps {
  programId: string;
  programName: string;
}

export default function EditProgramModal({
  programId,
  programName,
  onClose,
}: EditProgramModalProps) {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const [selectedProgramStatus, setSelectedProgramStatus] = useState('');

  const { data: statusData } = useQuery({
    queryKey: programKeys.statusDropdown(),
    queryFn: fetchProgramStatusDropdown,
    select: toKeyValueItems,
    staleTime: Infinity,
  });
  const toast = useToast();

  const [editedName, setEditedName] = useState(programName);

  // mutation 설정
  const mutation = useUpdateProgram({
    onSuccess: () => {
      onClose();
      toast.success('교육 정보가 수정되었습니다.');
    },
    onError: (error) => toast.error(`교육 정보 수정에 실패했습니다. ${errorMessageOf(error)}`),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!programName.trim()) {
      toast.warning('교육명을 입력해주세요.');
      return;
    }

    const updateData: UpdateProgramRequest = {
      programId,
      programName: editedName,
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
          교육명
        </label>
        <input
          id={`${fieldId}-field0`}
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          placeholder="교육명을 입력하세요"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 상태 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
        <Dropdown
          placeholder="모집 상태 선택"
          items={statusData ?? []}
          value={selectedProgramStatus}
          onChange={setSelectedProgramStatus}
        />
      </div>

      {/* 버튼 */}
      <div className="flex justify-end">
        <Button type="submit" label="수정" loading={mutation.isPending} />
      </div>
    </form>
  );
}
