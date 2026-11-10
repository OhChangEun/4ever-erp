'use client';

import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';
import {
  type EditUserRequest,
  type EmploymentInfoProps,
  type ProfileInfoResponse,
} from '../ProfileType';
import { getProfile } from '../profile.api';
import { useEditProfile } from '../profile.mutations';
import { profileKeys } from '../profile.keys';

// 칸 이름은 메시지 키로 두고 그릴 때 번역한다
type EmploymentLabelKey =
  'department' | 'position' | 'hireDate' | 'serviceYears' | 'email' | 'phone' | 'address';

const EmploymentInfo = ({ isEditing, setIsEditing }: EmploymentInfoProps) => {
  const t = useTranslations('myProfile.employment');
  const toast = useToast();
  const { data: profileInfo } = useQuery<ProfileInfoResponse>({
    queryKey: profileKeys.info(),
    queryFn: getProfile,
  });
  const summaryItems: Array<{ label: EmploymentLabelKey; value?: string; highlight?: boolean }> = [
    {
      label: 'department',
      value: profileInfo?.department,
    },
    {
      label: 'position',
      value: profileInfo?.position,
    },
    {
      label: 'hireDate',
      value: profileInfo?.hireDate,
    },
    {
      label: 'serviceYears',
      value: profileInfo?.serviceYears,
      highlight: true,
    },
  ];

  const detailItems: Array<{ label: EmploymentLabelKey; value?: string }> = [
    {
      label: 'email',
      value: profileInfo?.email,
    },
    {
      label: 'phone',
      value: profileInfo?.phoneNumber,
    },
    {
      label: 'address',
      value: profileInfo?.address,
    },
  ];

  // 낙관적 업데이트(내 정보 캐시에 입력값 병합)와 무효화는 profile.mutations.ts 한 곳.
  const { mutate: editProfile, isPending: isSaving } = useEditProfile({
    onSuccess: () => {
      setIsEditing(false);
      toast.success(t('editSuccess'));
    },
    onError: (error) => toast.error(t('editError', { message: errorMessageOf(error) })),
  });

  return (
    <div className="card-base overflow-hidden">
      <div className="bg-linear-to-r from-blue-600 via-blue-500 to-blue-400 px-6 py-8 text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/15 flex items-center justify-center">
              <i className="ri-user-3-line text-2xl"></i>
            </div>
            <div>
              <p className="text-sm text-white/80">{profileInfo?.employeeNumber}</p>
              <h2 className="text-2xl font-semibold">{profileInfo?.name}</h2>
              <p className="text-sm text-white/80">
                {profileInfo?.department} · {profileInfo?.position}
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4 lg:w-auto">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl px-4 py-3 ${item.highlight ? 'bg-white text-blue-600' : 'bg-white/10'}`}
              >
                <span
                  className={`text-xs font-medium ${item.highlight ? 'text-blue-500' : 'text-white/70'}`}
                >
                  {t(item.label)}
                </span>
                <p
                  className={`mt-1 text-sm font-semibold ${item.highlight ? 'text-blue-700' : 'text-white'}`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white px-6 py-6">
        {isEditing && profileInfo ? (
          // 편집을 시작할 때 한 번 마운트되고, 그때의 값으로 폼을 채운다.
          // 저장이 실패해 낙관적 값이 롤백되거나 재조회가 와도 입력은 그대로 남는다(우선순위 2)
          <ProfileEditForm
            initial={{
              email: profileInfo.email,
              phoneNumber: profileInfo.phoneNumber,
              address: profileInfo.address,
            }}
            isSaving={isSaving}
            onSubmit={editProfile}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detailItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border border-gray-100 bg-gray-50 px-4 py-4`}
              >
                <span className="text-xs font-medium text-gray-500">{t(item.label)}</span>
                <p className="mt-1 text-sm font-medium text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FORM_FIELDS: Array<{
  key: keyof EditUserRequest;
  label: EmploymentLabelKey;
  type?: string;
  readOnly?: boolean;
}> = [
  { key: 'email', label: 'email', type: 'email', readOnly: true },
  { key: 'phoneNumber', label: 'phone' },
  { key: 'address', label: 'address' },
];

interface ProfileEditFormProps {
  initial: EditUserRequest;
  isSaving: boolean;
  onSubmit: (data: EditUserRequest) => void;
  onCancel: () => void;
}

/**
 * 프로필 편집 폼. 서버 데이터를 effect 로 폼에 복사하지 않는다(R01, R02).
 * 그렇게 하면 저장 실패 롤백이나 재조회 때 effect 가 다시 돌아 입력이 지워진다.
 */
function ProfileEditForm({ initial, isSaving, onSubmit, onCancel }: ProfileEditFormProps) {
  const t = useTranslations('myProfile.employment');
  const [formData, setFormData] = useState<EditUserRequest>(initial);

  const handleChange = (key: keyof EditUserRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FORM_FIELDS.map((field) => {
          const commonClasses =
            'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
          const isReadOnly = field.readOnly ?? false;
          const inputClasses = `${commonClasses} ${
            isReadOnly
              ? 'cursor-not-allowed bg-gray-100 text-gray-500 focus:border-gray-200 focus:ring-0'
              : ''
          }`;

          return (
            <div key={field.key} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
              <label htmlFor={field.key} className="mb-2 block text-xs font-medium text-gray-500">
                {t(field.label)}
              </label>
              <input
                id={field.key}
                type={field.type ?? 'text'}
                value={formData[field.key] ?? ''}
                onChange={
                  isReadOnly ? undefined : (event) => handleChange(field.key, event.target.value)
                }
                readOnly={isReadOnly}
                className={inputClasses}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}

export default EmploymentInfo;
