'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@everp/ui';

import AttendanceRecord from './components/AttendanceRecord';
import TrainingStatus from './components/TrainingStatus';
import EmploymentInfo from './components/EmploymentInfo';

export default function ProfilePage() {
  const t = useTranslations('myProfile.page');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
            </div>
            <Button
              // primary 는 근태 칸의 출퇴근 하나(지침 "한 화면에 primary 는 하나")
              variant="secondary"
              label={isEditing ? t('cancelEdit') : t('edit')}
              onClick={() => {
                setIsEditing(!isEditing);
              }}
            />
          </div>
        </div>

        {/* 칸을 카드로 감싸지 않고 여백과 구분선으로 나눈다(디자인 지침 12장) */}
        <div className="space-y-10">
          <EmploymentInfo isEditing={isEditing} setIsEditing={setIsEditing} />
          <div className="grid grid-cols-1 gap-10 items-start lg:grid-cols-[22rem_1fr]">
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
