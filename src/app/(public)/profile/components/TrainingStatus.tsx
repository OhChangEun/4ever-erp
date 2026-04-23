'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { TrainingResponse } from '../ProfileType';
import {
  getAvailableTraining,
  getCompletedTraining,
  getProgressTraining,
  postTraining,
} from '../profile.api';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';

const TrainingStatus = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('progress');
  const getTrainingCategoryText = (status: string) => {
    switch (status) {
      case 'BASIC_TRAINING':
        return '기초 교육';
      case 'TECHNICAL_TRAINING':
        return '기술 교육';
    }
  };
  const { data: trainingRes } = useQuery<TrainingResponse[]>({
    queryKey: ['training', activeTab],
    queryFn: () => {
      switch (activeTab) {
        case 'progress':
          return getProgressTraining();
        case 'available':
          return getAvailableTraining();
        case 'completed':
          return getCompletedTraining();
        default:
          return Promise.resolve([]);
      }
    },
  });

  const { mutate: registerTraining } = useMutation({
    mutationFn: postTraining,
    onSuccess: () => {
      toast.success('교육 신청이 완료되었습니다.');
    },
    onError: () => {
      toast.error('교육 신청 중 오류가 발생했습니다.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
    },
  });

  const handleApplyTraining = (trainingId: string) => {
    registerTraining(trainingId);
  };

  return (
    <div className="card-base">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="ri-graduation-cap-line text-orange-600 text-lg"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">교육 현황</h2>
            <p className="text-sm text-gray-500">사내 교육 수강 및 신청 관리</p>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('progress')}
            className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
              activeTab === 'progress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            수강중인 교육
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            신청 가능한 교육
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            수료한 교육
          </button>
        </nav>
      </div>

      <div className="p-6 min-h-150 ">
        {/* 수강중인 교육 */}
        {activeTab === 'progress' && (
          <>
            {trainingRes && trainingRes.length > 0 ? (
              <div className="space-y-4">
                {trainingRes.map((training) => (
                  <div key={training.trainingId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {training.trainingName}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500">{training.description}</p>
                        <p className="text-xs text-gray-500">
                          {getTrainingCategoryText(training.category)} | {training.durationHours}
                          시간
                        </p>
                      </div>
                      <StatusLabel $statusCode={training.trainingStatus} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">수강중인 교육이 없습니다.</p>
            )}
          </>
        )}

        {/* 신청 가능한 교육 */}
        {activeTab === 'available' && (
          <>
            {trainingRes && trainingRes.length > 0 ? (
              <div className="space-y-4">
                {trainingRes.map((training) => (
                  <div key={training.trainingId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {training.trainingName}
                          </h3>
                        </div>
                        <p className="text-xs font-medium text-gray-500">{training.description}</p>
                        <p className="text-xs text-gray-500 mb-2">
                          {getTrainingCategoryText(training.category)} | {training.durationHours}
                          시간
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyTraining(training.trainingId)}
                      className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                    >
                      교육 신청하기
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">신청 가능한 교육이 없습니다.</p>
            )}
          </>
        )}

        {/* 수료한 교육 */}
        {activeTab === 'completed' && (
          <>
            {trainingRes && trainingRes.length > 0 ? (
              <div className="space-y-4">
                {trainingRes.map((training) => (
                  <div key={training.trainingId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {training.trainingName}
                        </h3>
                        <p className="text-xs text-gray-500">{training.durationHours}시간</p>
                        <p className="text-xs text-gray-500">
                          수료일: {training.complementationDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">수료</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">수료한 교육이 없습니다.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrainingStatus;
