'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { type DashboardProps } from '../types/DashboardWorkflowType';
import { workflowTabKey } from '../dashboard.utils';
import StatusLabel from '@/app/components/common/StatusLabel';
import { formatDateTime } from '@/app/utils/date';
import { TabButtons } from '@everp/ui';

const WorkflowStatus = ({ workflowData }: DashboardProps) => {
  const t = useTranslations('dashboard.workflow');
  const tNav = useTranslations('nav');
  const [activeTab, setActiveTab] = useState('first');

  const tabs = workflowData?.tabs ?? [];
  // 탭 수는 서버가 정한다. 두 개보다 적게 오면 빈 탭으로 둔다
  const firstTab = tabs.at(0);
  const secondTab = tabs.at(1);

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
          <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
        </div>

        <TabButtons
          label={tNav('tabsLabel', { title: t('title') })}
          tabs={[
            { id: 'first', name: t(`tabs.${workflowTabKey(firstTabCode)}`) },
            { id: 'second', name: t(`tabs.${workflowTabKey(secondTabCode)}`) },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <div className="space-y-3">
        {currentWorkflows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            {t('empty')}
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
                    {workflow.name ? workflow.name : t('unknownName')} •{' '}
                    {formatDateTime(workflow.date)}
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
