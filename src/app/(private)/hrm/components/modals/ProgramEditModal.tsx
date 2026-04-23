'use client';

import Button from '@/app/components/common/Button';
import { ModalProps } from '@/app/components/common/modal/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { FormEvent, useMemo, useState } from 'react';
import { fetchProgramStatusDropdown, patchProgram } from '@/app/(private)/hrm/api/hrm.api';
import { UpdateProgramRequest } from '@/app/(private)/hrm/types/HrmProgramApiType';
import Dropdown from '@/app/components/common/Dropdown';
import { KeyValueItem } from '@/app/types/CommonType';
import { useToast } from '@/app/components/common/toast/useToast';

interface EditProgramModalProps extends ModalProps {
  programId: string;
  programName: string;
}

export default function EditProgramModal({
  programId,
  programName,
  onClose,
}: EditProgramModalProps) {
  const [selectedProgramStatus, setSelectedProgramStatus] = useState('');

  const {
    data: statusData,
    isLoading: statusLoading,
    isError: errorLoading,
  } = useQuery({
    queryKey: ['programStatusDropdown'],
    queryFn: fetchProgramStatusDropdown,
    staleTime: Infinity,
  });
  const toast = useToast();

  const queryClient = useQueryClient();

  const [editedName, setEditedName] = useState(programName);

  // mutation 설정
  const mutation = useMutation({
    mutationFn: (data: UpdateProgramRequest) => patchProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programList'] });
      onClose();
      toast.success('교육 정보가 수정되었습니다.');
    },
    onError: (error) => {
      console.error('교육 정보 수정 실패', error);
      toast.error('교육 정보 수정에 실패했습니다.');
    },
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
        <label className="block text-sm font-medium text-gray-700 mb-1">교육명</label>
        <input
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
        <Button type="submit" label="수정" />
      </div>
    </form>
  );
}
