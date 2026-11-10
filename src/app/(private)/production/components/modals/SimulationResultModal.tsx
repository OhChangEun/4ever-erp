'use client';
import { useState } from 'react';
import { type QuotationSimulationData } from '@/app/(private)/production/types/QuotationSimulationApiType';
import { Button } from '@everp/ui';
import { Flex } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Table } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useTranslations } from 'next-intl';

interface SimulationResultModalProps extends ModalProps {
  simulationResults: QuotationSimulationData[];
  onConfirm: () => void;
}

// 결과별 색. 글자는 메시지(production.simulation.result.<키>)
const SHORTAGE_RESULT = {
  STOCK_SUFFICIENT: {
    bg: 'bg-green-50',
    textColor: 'text-green-600',
    subColor: 'text-green-500',
  },
  PASS: {
    bg: 'bg-blue-50',
    textColor: 'text-blue-600',
    subColor: 'text-blue-400',
  },
  FAIL: {
    bg: 'bg-red-50',
    textColor: 'text-red-600',
    subColor: 'text-red-400',
  },
} as const;

const isShortageResultKey = (status: string): status is keyof typeof SHORTAGE_RESULT =>
  status in SHORTAGE_RESULT;

export default function SimulationResultModal({
  simulationResults,
  onConfirm,
}: SimulationResultModalProps) {
  const t = useTranslations('production');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    simulationResults[0]?.quotationId || null,
  );

  const hasMpsTarget = simulationResults.some(
    (r) => r.simulation.shortageQuantity > 0 && r.simulation.status === 'PASS',
  );
  const selectedResult = simulationResults.find((r) => r.quotationId === selectedQuotationId);

  return (
    <Flex direction="col" gap={4} className="h-full">
      {/* 시뮬레이션 결과 테이블 */}
      <Flex direction="col" gap={2} className="flex-1 overflow-hidden">
        <h4 className="text-sm font-medium px-1 text-gray-700">{t('simulation.reviewTitle')}</h4>
        <div className="flex-1 overflow-auto">
          <Table
            maxHeight="25vh"
            columns={[
              {
                key: 'quotationNumber',
                label: t('common.quotationNumber'),
                width: '140px',
                render: (_, row: QuotationSimulationData) => (
                  <span className="font-medium text-blue-600">{row.quotationNumber}</span>
                ),
              },
              { key: 'customerCompanyName', label: t('common.customer'), width: '120px' },
              { key: 'productName', label: t('common.productName'), width: '130px' },
              {
                key: 'status',
                label: t('common.status'),
                render: (_, row: QuotationSimulationData) => (
                  <StatusLabel statusCode={row.simulation.status} />
                ),
              },
              {
                key: 'shortage',
                label: t('simulation.shortageReason'),
                width: '220px',
                render: (_, row: QuotationSimulationData) =>
                  row.simulation.status === 'FAIL' && row.simulation.shortageReason ? (
                    <span className="text-xs text-red-500">{row.simulation.shortageReason}</span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  ),
              },
              {
                key: 'suggestedDueDate',
                label: t('common.suggestedDueDate'),
                width: '120px',
                render: (_, row: QuotationSimulationData) => (
                  <span className="text-sm">{row.simulation.suggestedDueDate}</span>
                ),
              },
            ]}
            data={simulationResults}
            onRowClick={(row) => setSelectedQuotationId(row.quotationId)}
            emptyMessage={t('simulation.empty')}
          />
        </div>
      </Flex>

      {/* 선택된 견적 상세 정보 */}
      {selectedResult && (
        <Flex direction="col" gap={2} className="flex-1 overflow-hidden">
          <h4 className="text-sm font-medium px-1 text-gray-700">{t('simulation.detailTitle')}</h4>
          <Flex gap={3}>
            {/* 왼쪽: 제품 정보 패널 */}
            <Flex direction="col" gap={2} flex1 className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                {t('simulation.productInfo')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { label: t('common.customer'), value: selectedResult.customerCompanyName },
                    { label: t('common.productName'), value: selectedResult.productName },
                    {
                      label: t('common.requestDueDate'),
                      value: new Date(selectedResult.requestDueDate).toLocaleDateString('ko-KR'),
                    },
                    {
                      label: t('common.suggestedDueDate'),
                      value: selectedResult.simulation.suggestedDueDate,
                      valueClass:
                        selectedResult.simulation.status === 'FAIL'
                          ? 'text-red-500'
                          : 'text-gray-700',
                    },
                    {
                      label: t('simulation.shortageReason'),
                      value: selectedResult.simulation.shortageReason || '-',
                      valueClass: selectedResult.simulation.shortageReason
                        ? 'text-red-500'
                        : 'text-gray-400',
                    },
                  ] satisfies { label: string; value: string; valueClass?: string }[]
                ).map(({ label, value, valueClass }) => (
                  <Flex
                    key={label}
                    direction="col"
                    gap={1}
                    className="bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className={`font-medium text-sm ${valueClass ?? 'text-gray-700'}`}>
                      {value}
                    </span>
                  </Flex>
                ))}
              </div>
            </Flex>

            {/* 오른쪽: 수량 분석 패널 */}
            {(() => {
              const { status, shortageQuantity, availableQuantity } = selectedResult.simulation;
              const resultKey = isShortageResultKey(status) ? status : 'FAIL';
              const { bg, textColor, subColor } = SHORTAGE_RESULT[resultKey];
              return (
                <Flex
                  direction="col"
                  gap={1}
                  className="w-44 border border-gray-100 rounded-xl p-3"
                >
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    {t('simulation.quantityAnalysis')}
                  </p>
                  <Flex direction="col" gap={1} className="bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-400">{t('simulation.requestQuantity')}</span>
                    <span className="font-medium text-sm text-gray-700">
                      {selectedResult.requestQuantity.toLocaleString()} EA
                    </span>
                  </Flex>
                  <p className="text-center text-gray-300 text-xs select-none">−</p>
                  <Flex direction="col" gap={1} className="bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-400">
                      {t('simulation.availableQuantity')}
                    </span>
                    <span className="font-medium text-sm text-gray-700">
                      {availableQuantity.toLocaleString()} EA
                    </span>
                  </Flex>
                  <p className="text-center text-gray-300 text-xs select-none">=</p>
                  <Flex direction="col" gap={1} className={`rounded-lg px-3 py-2 ${bg}`}>
                    <span className="text-xs text-gray-500">
                      {t('simulation.productionNeeded')}
                    </span>
                    <span className={`font-semibold text-sm ${textColor}`}>
                      {shortageQuantity.toLocaleString()} EA
                    </span>
                    <span className={`text-xs ${subColor}`}>
                      {t(`simulation.result.${resultKey}`)}
                    </span>
                  </Flex>
                </Flex>
              );
            })()}
          </Flex>
        </Flex>
      )}

      {/* 액션 버튼 */}
      <Flex justify="end" gap={3} className="pt-4">
        <Button label={t('simulation.createMps')} onClick={onConfirm} disabled={!hasMpsTarget} />
      </Flex>
    </Flex>
  );
}
