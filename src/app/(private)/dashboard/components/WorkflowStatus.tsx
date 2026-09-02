'use client';

import { useState } from 'react';
import { DashboardProps } from '../types/DashboardWorkflowType';
import { getTabCodeText } from '../dashboard.utils';
import StatusLabel from '@/app/components/common/StatusLabel';
import { formatDateTime } from '@/app/utils/date';

const WorkflowStatus = ({ workflowData }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState('first');

  const tabs = workflowData?.tabs ?? [];
  const firstTab = tabs[0];
  const secondTab = tabs[1];

  const firstTabCode = firstTab?.tabCode;
  const secondTabCode = secondTab?.tabCode;

  const firstTabItems = firstTab?.items ?? [];
  const secondTabItems = secondTab?.items ?? [];

  const currentWorkflows = activeTab === 'first' ? firstTabItems : secondTabItems;

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <i className="ri-flow-chart text-blue-600 text-lg"></i>
          <h2 className="text-lg font-semibold text-gray-900">워크플로우 현황</h2>
        </div>

        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('first')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
              activeTab === 'first' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 '
            }`}
          >
            {getTabCodeText(firstTabCode)}
          </button>
          <button
            onClick={() => setActiveTab('second')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
              activeTab === 'second'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {getTabCodeText(secondTabCode)}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {currentWorkflows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            표시할 워크플로우가 없습니다.
          </div>
        ) : (
          currentWorkflows.map((workflow) => (
            <div
              key={workflow.itemId}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg  transition-colors duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <i className="ri-file-text-line text-gray-600"></i>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900">{workflow.itemTitle}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{workflow.itemNumber}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {workflow.name ? workflow.name : '알수없음'} • {formatDateTime(workflow.date)}
                  </p>
                </div>
              </div>
              <StatusLabel statusCode={workflow.statusCode} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkflowStatus;
