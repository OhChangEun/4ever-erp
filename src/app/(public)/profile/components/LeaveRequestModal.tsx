'use client';

import { type FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { type RequestVacation } from '../ProfileType';
import { useIsMutating } from '@tanstack/react-query';
import { profileMutationKey } from '../profile.mutations';
import { type ModalProps } from '@/app/components/common/modal/types';

export const EMPTY_LEAVE: RequestVacation = { leaveType: 'ANNUAL', startDate: '', endDate: '' };

interface LeaveRequestModalProps extends ModalProps {
  /** 여는 순간의 값. 그 뒤 바뀐 값은 이 모달이 들고 onFormChange 로 알린다 */
  initialForm: RequestVacation;
  onFormChange: (form: RequestVacation) => void;
  onSubmit: (form: RequestVacation) => void;
}

export default function LeaveRequestModal({
  initialForm,
  onFormChange,
  onSubmit,
  onClose,
}: LeaveRequestModalProps) {
  const t = useTranslations('myProfile');
  const [form, setForm] = useState(initialForm);

  const handleChange = (key: keyof RequestVacation, value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    onFormChange(next);
  };

  // 넘겨받은 값은 여는 순간에 굳는다. 진행 중인지는 캐시에서 읽는다
  const isRequestingVacation =
    useIsMutating({ mutationKey: profileMutationKey('requestVacation') }) > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRequestingVacation) return;
    onSubmit(form);
  };

  return (
    <>
      <p className="mb-4 text-sm text-gray-500">{t('leave.hint')}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="leave-type" className="mb-2 block text-sm font-medium text-gray-700">
            {t('leave.type')}
          </label>
          <select
            id="leave-type"
            value={form.leaveType}
            onChange={(event) => handleChange('leaveType', event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="ANNUAL">{t('leave.ANNUAL')}</option>
            <option value="SICK">{t('leave.SICK')}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="leave-start" className="mb-2 block text-sm font-medium text-gray-700">
              {t('leave.startDate')}
            </label>
            <input
              id="leave-start"
              type="date"
              value={form.startDate}
              onChange={(event) => handleChange('startDate', event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              required
            />
          </div>
          <div>
            <label htmlFor="leave-end" className="mb-2 block text-sm font-medium text-gray-700">
              {t('leave.endDate')}
            </label>
            <input
              id="leave-end"
              type="date"
              value={form.endDate}
              onChange={(event) => handleChange('endDate', event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 sm:w-auto"
          >
            {t('leave.cancel')}
          </button>
          <button
            type="submit"
            disabled={isRequestingVacation}
            className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 sm:w-auto"
          >
            {t('leave.submit')}
          </button>
        </div>
      </form>
    </>
  );
}
