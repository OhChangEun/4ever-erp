import Button from '@/app/components/common/Button';
import { ModalProps } from '@/app/components/common/modal/types';
import { CreateProgramRequest } from '../../types/HrmProgramApiType';
import { fetchTrainingCategoryDropdown, postProgram } from '../../api/hrm.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import Dropdown from '@/app/components/common/Dropdown';
import { KeyValueItem } from '@/app/types/CommonType';
import { useToast } from '@/app/components/common/toast/useToast';

export default function AddTrainingModal({ onClose }: ModalProps) {
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState(''); // 부서

  const {
    data: categoryData,
    isLoading: categoryLoading,
    isError: categoryError,
  } = useQuery({
    queryKey: ['trainingCategoryDropdown'],
    queryFn: fetchTrainingCategoryDropdown,
    staleTime: Infinity,
  });

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: CreateProgramRequest) => postProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programList'] });
      onClose();
      toast.success('교육 프로그램이 추가되었습니다.');
    },
    onError: (error) => {
      console.error('교육 프로그램 추가 실패', error);
      toast.error('교육 프로그램 추가에 실패했습니다.');
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    // 체크박스 값들 수집
    const departments = formData.getAll('departments') as string[];
    const positions = formData.getAll('positions') as string[];

    // 필수 체크
    if (!selectedCategory) {
      toast.warning('카테고리를 선택해주세요.');
      return;
    }

    if (departments.length === 0) {
      toast.warning('대상 부서를 최소 1개 이상 선택해주세요.');
      return;
    }

    if (positions.length === 0) {
      toast.warning('대상 직급을 최소 1개 이상 선택해주세요.');
      return;
    }

    const programData: CreateProgramRequest = {
      programName: formData.get('programName') as string,
      category: selectedCategory,
      trainingHour: Number(formData.get('trainingHour')),
      isOnline: true,
      startDate: formData.get('startDate') as string,
      capacity: Number(formData.get('capacity')),
      requiredDepartments: departments,
      requiredPositions: positions,
      description: formData.get('description') as string,
    };

    mutation.mutate(programData);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">교육명</label>
            <input
              type="text"
              name="programName"
              required
              placeholder="교육 프로그램명을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>

            <Dropdown
              placeholder="카테고리 선택"
              items={categoryData ?? []}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">교육 시간</label>
            <input
              type="text"
              name="trainingHour"
              required
              placeholder="예: 8시간, 2일"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
          <input
            type="date"
            name="startDate"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">대상 부서</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex items-center">
              <input type="checkbox" name="departments" value="개발팀" className="mr-2" />
              <span className="text-sm">개발팀</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="departments" value="마케팅팀" className="mr-2" />
              <span className="text-sm">마케팅팀</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="departments" value="영업팀" className="mr-2" />
              <span className="text-sm">영업팀</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="departments" value="인사팀" className="mr-2" />
              <span className="text-sm">인사팀</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="departments" value="재무팀" className="mr-2" />
              <span className="text-sm">재무팀</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="departments" value="재고팀" className="mr-2" />
              <span className="text-sm">재고팀</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">대상 직급</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex items-center">
              <input type="checkbox" name="positions" value="사원" className="mr-2" />
              <span className="text-sm">사원</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="positions" value="대리" className="mr-2" />
              <span className="text-sm">대리</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="positions" value="과장" className="mr-2" />
              <span className="text-sm">과장</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="positions" value="차장" className="mr-2" />
              <span className="text-sm">차장</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="positions" value="부장" className="mr-2" />
              <span className="text-sm">부장</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">교육 설명</label>
          <textarea
            name="description"
            rows={4}
            placeholder="교육 내용과 목표를 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div className="flex justify-end">
          <Button type="submit" label="교육 프로그램 추가" />
        </div>
      </form>
    </>
  );
}
