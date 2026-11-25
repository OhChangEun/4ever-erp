'use client';

import { type ProfileInfo } from './types/CustomerOrSupplierInfoType';
import { type ModalProps } from '@/app/components/common/modal/types';
import { getSupOrCusProfile } from './header.api';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { partnerProfileKeys } from './header.keys';

const ProfileInfoModal = ({ onClose }: ModalProps) => {
  const role = useRole();
  const t = useTranslations();

  const { data: profileInfoRes } = useQuery<ProfileInfo>({
    queryKey: partnerProfileKeys.byRole(role),
    queryFn: getSupOrCusProfile,
  });

  return (
    <div className="space-y-6">
      {/* 회사 정보 */}
      <div>
        <p className="text-2xl font-bold text-gray-900">{profileInfoRes?.companyName}</p>
        <p className="text-sm text-gray-500 mt-1">
          {t('partnerProfile.businessNumber', { number: profileInfoRes?.businessNumber ?? '' })}
        </p>
      </div>

      <hr className="border-gray-200" />

      {/* 주소 */}
      <div className="flex items-start gap-3">
        <i className="ri-map-pin-line text-blue-500 text-lg mt-1"></i>
        <div>
          <p className="text-gray-700 font-medium">{t('partnerProfile.address')}</p>
          <p className="text-gray-600 text-sm">{profileInfoRes?.baseAddress}</p>
          <p className="text-gray-600 text-sm">{profileInfoRes?.detailAddress}</p>
        </div>
      </div>

      {/* 연락처 */}
      <div className="flex items-start gap-3">
        <i className="ri-phone-line text-green-600 text-lg mt-1"></i>
        <div>
          <p className="text-gray-700 font-medium">{t('partnerProfile.officePhone')}</p>
          <p className="text-gray-600 text-sm">{profileInfoRes?.officePhone}</p>
        </div>
      </div>

      {/* 담당자 */}
      <div className="flex items-start gap-3">
        <i className="ri-user-line text-purple-500 text-lg mt-1"></i>
        <div>
          <p className="text-gray-700 font-medium">{t('partnerProfile.contact')}</p>
          <p className="text-gray-600 text-sm">{profileInfoRes?.customerName}</p>
          <p className="text-gray-600 text-sm">{profileInfoRes?.phoneNumber}</p>
        </div>
      </div>

      {/* 이메일 */}
      <div className="flex items-start gap-3">
        <i className="ri-mail-line text-amber-500 text-lg mt-1"></i>
        <div>
          <p className="text-gray-700 font-medium">{t('partnerProfile.email')}</p>
          <p className="text-gray-600 text-sm">{profileInfoRes?.email}</p>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
};

export default ProfileInfoModal;
