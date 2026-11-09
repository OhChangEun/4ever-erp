import { Button } from '@everp/ui';
import { ModalProps } from '@/app/components/common/modal/types';
import { CreateProgramRequest } from '../../types/HrmProgramApiType';
import { fetchTrainingCategoryDropdown } from '../../api/hrm.api';
import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState, useId } from 'react';
import { Dropdown } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useCreateProgram } from '@/app/(private)/hrm/api/hrm.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { programKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { formText, formTexts } from '@/lib/formData';
import { toKeyValueItems } from '@/lib/api/options';

export default function AddTrainingModal({ onClose }: ModalProps) {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState(''); // 부서

  const { data: categoryData } = useQuery({
    queryKey: programKeys.categoryDropdown(),
    queryFn: fetchTrainingCategoryDropdown,
    select: toKeyValueItems,
    staleTime: Infinity,
  });

  const mutation = useCreateProgram({
    onSuccess: () => {
      onClose();
      toast.success('교육 프로그램이 추가되었습니다.');
    },
    onError: (error) => toast.error(`교육 프로그램 추가에 실패했습니다. ${errorMessageOf(error)}`),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    // 체크박스 값들 수집
    const departments = formTexts(formData, 'departments');
    const positions = formTexts(formData, 'positions');

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
      programName: formText(formData, 'programName'),
      category: selectedCategory,
      trainingHour: Number(formData.get('trainingHour')),
      isOnline: true,
      startDate: formText(formData, 'startDate'),
      capacity: Number(formData.get('capacity')),
      requiredDepartments: departments,
      requiredPositions: positions,
      description: formText(formData, 'description'),
    };

    mutation.mutate(programData);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${fieldId}-programName`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              교육명
            </label>
            <input
              id={`${fieldId}-programName`}
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
            <label
              htmlFor={`${fieldId}-trainingHour`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              교육 시간
            </label>
            <input
              id={`${fieldId}-trainingHour`}
              type="text"
              name="trainingHour"
              required
              placeholder="예: 8시간, 2일"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-startDate`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            시작일
          </label>
          <input
            id={`${fieldId}-startDate`}
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
          <label
            htmlFor={`${fieldId}-description`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            교육 설명
          </label>
          <textarea
            id={`${fieldId}-description`}
            name="description"
            rows={4}
            placeholder="교육 내용과 목표를 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div className="flex justify-end">
          <Button type="submit" label="교육 프로그램 추가" loading={mutation.isPending} />
        </div>
      </form>
    </>
  );
}
