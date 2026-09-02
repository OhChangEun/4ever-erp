'use client';

import Link from 'next/link';
import { ProfileHeaderProps } from '../ProfileType';

const ProfileHeader = ({ isEditing, setIsEditing }: ProfileHeaderProps) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 cursor-pointer">
              <i className="ri-arrow-left-line text-xl"></i>
            </Link>
            <div className="pl-2">
              <h1 className="text-xl font-bold text-gray-900">내 프로필</h1>
              <p className="text-sm text-gray-500">개인 정보 및 근무 현황</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setIsEditing(true);
              }}
              className={`px-4 py-2 font-medium rounded-lg transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center space-x-2 ${
                isEditing
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <i className={isEditing ? 'ri-close-line' : 'ri-edit-line'}></i>
              <span>{isEditing ? '수정 취소' : '프로필 수정'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ProfileHeader;
