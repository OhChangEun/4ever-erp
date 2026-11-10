'use client';

import { type ProfileInfo, type ProfileInfoModalProps } from './types/CustomerOrSupplierInfoType';
import { getSupOrCusProfile } from './header.api';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { partnerProfileKeys } from './header.keys';

const ProfileInfoModal = ({ setIsOpen }: ProfileInfoModalProps) => {
  const role = useRole();
  const t = useTranslations();

  const { data: profileInfoRes } = useQuery<ProfileInfo>({
    queryKey: partnerProfileKeys.byRole(role),
    queryFn: getSupOrCusProfile,
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-overlay animate-fadeIn">
      <div className="bg-white w-[520px] rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <i className="ri-building-2-line text-white text-xl"></i>
            {t('partnerProfile.title')}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
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
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfoModal;
