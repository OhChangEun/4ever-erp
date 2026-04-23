'use client';

import Button from '@/app/components/common/Button';
import { ModalProps } from '@/app/components/common/modal/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { FormEvent, useMemo, useState } from 'react';
import { fetchProgramListDropdown, postProgramToEmployee } from '@/app/(private)/hrm/api/hrm.api';
import { UpdateProgramToEmployeeRequest } from '@/app/(private)/hrm/types/HrmProgramApiType';
import Dropdown from '@/app/components/common/Dropdown';
import { KeyValueItem } from '@/app/types/CommonType';
import { useToast } from '@/app/components/common/toast/useToast';

interface AddEmployeeTrainingModalProps extends ModalProps {
  employeeId: string;
}

export default function AddEmployeeTrainingModal({
  employeeId,
  onClose,
}: AddEmployeeTrainingModalProps) {
  const [selectedProgram, setSelectedProgram] = useState('');

  const queryClient = useQueryClient();
  const toast = useToast();

  // 교육 프로그램 드롭다운 조회
  const {
    data: programData,
    isLoading: programLoading,
    isError: programError,
  } = useQuery({
    queryKey: ['programListDropdown'],
    queryFn: fetchProgramListDropdown,
    staleTime: Infinity,
  });

  // mutation 설정
  const mutation = useMutation({
    mutationFn: ({ employeeId, programId }: UpdateProgramToEmployeeRequest) =>
      postProgramToEmployee({ employeeId, programId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingList'] });
      onClose();
      toast.info('교육 프로그램이 지정되었습니다.');
    },
    onError: (error) => {
      console.log('교육 프로그램 추가 실패', error);
      toast.error('교육 프로그램 지정에 실패했습니다.');
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedProgram) {
      toast.warning('교육 프로그램을 선택해주세요.');
    }

    mutation.mutate({ employeeId, programId: selectedProgram });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 교육 프로그램 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">교육 프로그램 선택</label>
        <Dropdown
          placeholder="프로그램 선택"
          items={programData ?? []}
          value={selectedProgram}
          onChange={setSelectedProgram}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" label="추가" />
      </div>
    </form>
  );
}
