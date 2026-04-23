'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { useToast } from '@/app/components/common/toast/useToast';
import { EditUserRequest, EmploymentInfoProps, ProfileInfoResponse } from '../ProfileType';
import { getProfile, postProfile } from '../profile.api';

const EmploymentInfo = ({ $isEditing, $setIsEditing }: EmploymentInfoProps) => {
  const toast = useToast();
  const { data: profileInfo } = useQuery<ProfileInfoResponse>({
    queryKey: ['profileInfo'],
    queryFn: getProfile,
  });
  const [formData, setFormData] = useState<EditUserRequest>({
    email: '',
    phoneNumber: '',
    address: '',
  });

  const summaryItems = [
    {
      label: '부서',
      value: profileInfo?.department,
    },
    {
      label: '직책',
      value: profileInfo?.position,
    },
    {
      label: '입사일',
      value: profileInfo?.hireDate,
    },
    {
      label: '근속기간',
      value: profileInfo?.serviceYears,
      highlight: true,
    },
  ];

  const detailItems = [
    {
      label: '이메일',
      value: profileInfo?.email,
    },
    {
      label: '연락처',
      value: profileInfo?.phoneNumber,
    },
    {
      label: '주소',
      value: profileInfo?.address,
    },
  ];

  const formFields: Array<{
    key: keyof EditUserRequest;
    label: string;
    type?: string;
    readOnly?: boolean;
  }> = [
    { key: 'email', label: '이메일', type: 'email', readOnly: true },
    { key: 'phoneNumber', label: '연락처' },
    { key: 'address', label: '주소' },
  ];

  useEffect(() => {
    setFormData({
      email: profileInfo?.email ?? '',
      phoneNumber: profileInfo?.phoneNumber ?? '',
      address: profileInfo?.address ?? '',
    });
  }, [profileInfo]);

  const handleChange = (key: keyof EditUserRequest, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const queryClient = useQueryClient();
  const { mutate: editProfile } = useMutation({
    mutationFn: postProfile,
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['profileInfo'] });
      const previousData = queryClient.getQueryData(['profileInfo']);
      queryClient.setQueryData(['profileInfo'], (old: EditUserRequest) => ({
        ...old!,
        ...newData,
      }));
      return { previousData };
    },
    onError: (_error, _newData, context) => {
      if (context?.previousData) queryClient.setQueryData(['profileInfo'], context.previousData);
      toast.error('프로필 수정 중 오류가 발생했습니다.');
    },
    onSuccess: () => {
      $setIsEditing(false);
      toast.success('프로필 수정이 완료되었습니다.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profileInfo'] });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    editProfile(formData);
  };

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
                  {item.label}
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
        {$isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {formFields.map((field) => {
                const commonClasses =
                  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
                const isReadOnly = field.readOnly ?? false;
                const inputClasses = `${commonClasses} ${
                  isReadOnly
                    ? 'cursor-not-allowed bg-gray-100 text-gray-500 focus:border-gray-200 focus:ring-0'
                    : ''
                }`;

                return (
                  <div
                    key={field.key}
                    className={`rounded-xl border border-gray-100 bg-gray-50 px-4 py-4  
                    `}
                  >
                    <label
                      htmlFor={field.key}
                      className="mb-2 block text-xs font-medium text-gray-500"
                    >
                      {field.label}
                    </label>
                    <input
                      id={field.key}
                      type={field.type ?? 'text'}
                      value={formData[field.key]}
                      onChange={
                        isReadOnly
                          ? undefined
                          : (event) => handleChange(field.key, event.target.value)
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
                onClick={() => {
                  $setIsEditing(false);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detailItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border border-gray-100 bg-gray-50 px-4 py-4`}
              >
                <span className="text-xs font-medium text-gray-500">{item.label}</span>
                <p className="mt-1 text-sm font-medium text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmploymentInfo;
