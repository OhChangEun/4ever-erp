'use client';

import { fetchProgramList } from '@/app/(private)/hrm/api/hrm.api';
import {
  type ProgramListData,
  type ProgramRequestParams,
} from '@/app/(private)/hrm/types/HrmProgramApiType';
import { useModal } from '@/app/components/common/modal/useModal';
import { Pagination } from '@everp/ui';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState, useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import ProgramDetailModal from '@/app/(private)/hrm/components/modals/ProgramDetailModal';
import AddTrainingModal from '@/app/(private)/hrm/components/modals/AddProgramModal';
import EditProgramModal from '../../../modals/ProgramEditModal';
import StatusLabel from '@/app/components/common/StatusLabel';
import { programKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { Button } from '@everp/ui';
/** tabButtons: 하위 탭 세그먼트. 툴바 왼쪽에 둔다(SubNavigation 이 넘긴다) */
export default function AvailableProgramTab({ tabButtons }: { tabButtons?: ReactNode }) {
  const t = useTranslations('hrm');
  // --- 모달 출력 ---
  const { openModal } = useModal();

  // --- 페이지 네이션 ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const programQueryParams = useMemo(
    (): ProgramRequestParams => ({
      page: currentPage - 1,
      size: pageSize,
    }),
    [currentPage],
  );

  const { data: programData, isPlaceholderData } = useQuery({
    queryKey: programKeys.list(programQueryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchProgramList(programQueryParams),
  });

  const programList = programData?.content ?? [];
  const pageInfo = programData?.page;

  const handleViewProgramDetail = (program: ProgramListData) => {
    openModal(ProgramDetailModal, {
      title: t('programs.detailTitle'),
      programId: program.programId,
    });
  };

  const handleViewProgramRegister = () => {
    openModal(AddTrainingModal, {
      title: t('programs.add'),
    });
  };

  const handleEditProgram = (program: ProgramListData) => {
    openModal(EditProgramModal, {
      title: t('programs.editTitle'),
      programId: program.programId,
      programName: program.programName,
      statusCode: program.statusCode,
    });
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {tabButtons}
        <Button label={t('programs.add')} onClick={handleViewProgramRegister} />
      </div>

      {/* 프로그램 카드는 독립 정보 단위. 행 이름은 아이콘 대신 글자(지침 12장 아이콘 세 곳) */}
      <ul
        role="list"
        aria-busy={isPlaceholderData || undefined}
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
      >
        {programList.map((program) => (
          <li key={program.programId} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{program.programName}</h4>
                <StatusLabel statusCode={program.category} />
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                <StatusLabel statusCode={program.statusCode} />
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mb-4 text-sm">
              <dt className="text-gray-500">{t('programs.hours')}</dt>
              <dd className="text-gray-800">
                {t('common.hours', { count: program.trainingHour })}
              </dd>
              <dt className="text-gray-500">{t('programs.mode')}</dt>
              <dd className="text-gray-800">
                {program.isOnline ? t('programs.online') : t('programs.offline')}
              </dd>
              <dt className="text-gray-500">{t('programs.capacity')}</dt>
              <dd className="text-gray-800">{t('common.people', { count: program.capacity })}</dd>
            </dl>
            {/* 카드 동작은 텍스트 링크. 툴바의 프로그램 추가가 이 화면의 primary 하나 */}
            <div className="flex gap-1 pt-3 border-t border-gray-200">
              {/* 첫 링크 글자를 위 이름 글자와 같은 선에(ghost 안쪽 여백 px-3 만큼 당긴다) */}
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3"
                label={t('common.viewDetail')}
                onClick={() => handleViewProgramDetail(program)}
              />
              <Button
                variant="ghost"
                size="sm"
                label={t('programs.manage')}
                onClick={() => handleEditProgram(program)}
              />
            </div>
          </li>
        ))}
      </ul>

      <Pagination
        currentPage={currentPage}
        totalPages={pageInfo?.totalPages ?? 1}
        totalElements={pageInfo?.totalElements}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
