'use client';

import { useState } from 'react';

import AttendanceRecord from './components/AttendanceRecord';
import TrainingStatus from './components/TrainingStatus';
import EmploymentInfo from './components/EmploymentInfo';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">내 프로필</h1>
              <p className="text-sm text-gray-500 mt-1">개인 정보 및 근무 현황</p>
            </div>
            <button
              onClick={() => {
                setIsEditing(!isEditing);
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

        <div className="space-y-6">
          <EmploymentInfo isEditing={isEditing} setIsEditing={setIsEditing} />
          <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-[22rem_1fr]">
            <div className="lg:sticky lg:top-24 lg:h-fit">
              <AttendanceRecord />
            </div>
            <div>
              <TrainingStatus />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
