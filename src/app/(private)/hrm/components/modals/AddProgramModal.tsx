import { Button } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { type CreateProgramRequest } from '../../types/HrmProgramApiType';
import { fetchTrainingCategoryDropdown } from '../../api/hrm.api';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Dropdown } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useCreateProgram } from '@/app/(private)/hrm/api/hrm.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { programKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { formText, formTexts } from '@/lib/formData';
import { toKeyValueItems } from '@/lib/api/options';
import {
  PROGRAM_TARGET_DEPARTMENTS,
  PROGRAM_TARGET_POSITIONS,
} from '@/app/(private)/hrm/programTargets';

export default function AddTrainingModal({ onClose }: ModalProps) {
  const t = useTranslations('hrm');
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
      toast.success(t('programs.created'));
    },
    onError: (error) => toast.error(t('programs.createError', { message: errorMessageOf(error) })),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    // 체크박스 값들 수집
    const departments = formTexts(formData, 'departments');
    const positions = formTexts(formData, 'positions');

    // 필수 체크
    if (!selectedCategory) {
      toast.warning(t('programs.categoryRequired'));
      return;
    }

    if (departments.length === 0) {
      toast.warning(t('programs.departmentRequired'));
      return;
    }

    if (positions.length === 0) {
      toast.warning(t('programs.positionRequired'));
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
              {t('programs.name')}
            </label>
            <input
              id={`${fieldId}-programName`}
              type="text"
              name="programName"
              required
              placeholder={t('programs.programNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('programs.category')}
            </label>

            <Dropdown
              placeholder={t('programs.selectCategory')}
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
              {t('programs.hours')}
            </label>
            <input
              id={`${fieldId}-trainingHour`}
              type="text"
              name="trainingHour"
              required
              placeholder={t('programs.hoursPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-startDate`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('programs.startDate')}
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
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('programs.targetDepartments')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PROGRAM_TARGET_DEPARTMENTS.map((option) => (
              <label key={option.key} className="flex items-center">
                <input type="checkbox" name="departments" value={option.value} className="mr-2" />
                <span className="text-sm">{t(`programs.departmentOptions.${option.key}`)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('programs.targetPositions')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PROGRAM_TARGET_POSITIONS.map((option) => (
              <label key={option.key} className="flex items-center">
                <input type="checkbox" name="positions" value={option.value} className="mr-2" />
                <span className="text-sm">{t(`programs.positionOptions.${option.key}`)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-description`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('programs.descriptionLabel')}
          </label>
          <textarea
            id={`${fieldId}-description`}
            name="description"
            rows={4}
            placeholder={t('programs.descriptionPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div className="flex justify-end">
          <Button type="submit" label={t('programs.submit')} loading={mutation.isPending} />
        </div>
      </form>
    </>
  );
}
