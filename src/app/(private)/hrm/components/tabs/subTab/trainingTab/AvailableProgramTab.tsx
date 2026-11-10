'use client';

import { fetchProgramList } from '@/app/(private)/hrm/api/hrm.api';
import {
  type ProgramListData,
  type ProgramRequestParams,
} from '@/app/(private)/hrm/types/HrmProgramApiType';
import { useModal } from '@/app/components/common/modal/useModal';
import { Pagination } from '@everp/ui';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import ProgramDetailModal from '@/app/(private)/hrm/components/modals/ProgramDetailModal';
import AddTrainingModal from '@/app/(private)/hrm/components/modals/AddProgramModal';
import EditProgramModal from '../../../modals/ProgramEditModal';
import StatusLabel from '@/app/components/common/StatusLabel';
import { programKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { Button } from '@everp/ui';
export default function AvailableProgramTab() {
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
    });
  };
  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button label={t('programs.add')} onClick={handleViewProgramRegister} />
      </div>

      <div
        aria-busy={isPlaceholderData || undefined}
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
      >
        {programList.map((program) => (
          <div key={program.programId} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{program.programName}</h4>
                <StatusLabel statusCode={program.category} />
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                <StatusLabel statusCode={program.statusCode} />
              </span>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <i className="ri-time-line mr-2"></i>
                <span className="pt-1">{t('common.hours', { count: program.trainingHour })}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <i className="ri-computer-line mr-2"></i>
                <span className="pt-1">{program.isOnline}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <i className="ri-team-line mr-2"></i>
                <span className="pt-1">{t('common.people', { count: program.capacity })}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                label={t('common.viewDetail')}
                variant="secondary"
                onClick={() => handleViewProgramDetail(program)}
              />
              <Button label={t('programs.manage')} onClick={() => handleEditProgram(program)} />
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={pageInfo?.totalPages ?? 1}
        totalElements={pageInfo?.totalElements}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
