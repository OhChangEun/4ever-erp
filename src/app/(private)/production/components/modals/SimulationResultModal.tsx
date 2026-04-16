'use client';
import { useState } from 'react';
import { QuotationSimulationData } from '@/app/(private)/production/types/QuotationSimulationApiType';
import Button from '@/app/components/common/Button';
import Flex from '@/app/components/common/Flex';
import StatusLabel from '@/app/components/common/StatusLabel';
import Table from '@/app/components/common/Table';
import { ModalProps } from '@/app/components/common/modal/types';

interface SimulationResultModalProps extends ModalProps {
  simulationResults: QuotationSimulationData[];
  onConfirm: () => void;
}

export default function SimulationResultModal({
  simulationResults,
  onConfirm,
}: SimulationResultModalProps) {
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    simulationResults[0]?.quotationId || null,
  );

  const passResults = simulationResults.filter((r) => r.simulation.status === 'PASS');
  const passCount = passResults.length;
  const selectedResult = simulationResults.find((r) => r.quotationId === selectedQuotationId);

  return (
    <Flex direction="col" gap={4} className="h-full">
      {/* 시뮬레이션 결과 테이블 */}
      <Flex direction="col" gap={2} className="flex-1 overflow-hidden">
        <h4 className="text-sm font-medium px-1 text-gray-700">생산 검토 현황</h4>
        <div className="flex-1 overflow-auto">
          <Table
            maxHeight="25vh"
            columns={[
              {
                key: 'quotationNumber',
                label: '견적번호',
                align: 'center',
                width: '150px',
                render: (_, row: QuotationSimulationData) => (
                  <span className="font-medium text-blue-600">{row.quotationNumber}</span>
                ),
              },
              { key: 'customerCompanyName', label: '고객사', align: 'center', width: '120px' },
              { key: 'productName', label: '제품명', width: '150px' },
              {
                key: 'status',
                label: '상태',
                align: 'center',
                render: (_, row: QuotationSimulationData) => (
                  <StatusLabel $statusCode={row.simulation.status} />
                ),
              },
              {
                key: 'shortage',
                label: '부족 사유',
                align: 'center',
                width: '200px',
                render: (_, row: QuotationSimulationData) =>
                  row.simulation.status === 'FAIL' && row.simulation.shortageReason ? (
                    <span className="text-xs text-red-500">{row.simulation.shortageReason}</span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  ),
              },
              {
                key: 'suggestedDueDate',
                label: '제안 납기',
                align: 'center',
                width: '120px',
                render: (_, row: QuotationSimulationData) => (
                  <span className="text-sm">{row.simulation.suggestedDueDate}</span>
                ),
              },
            ]}
            data={simulationResults}
            onRowClick={(row) =>
              setSelectedQuotationId((row as QuotationSimulationData).quotationId)
            }
            emptyMessage="시뮬레이션 결과가 없습니다."
          />
        </div>
      </Flex>

      {/* 선택된 견적 상세 정보 */}
      {selectedResult && (
        <Flex direction="col" gap={2} className="flex-1 overflow-hidden">
          <h4 className="text-sm font-medium px-1 text-gray-700 mb-3">상세 정보</h4>
          <Flex gap={3}>
            {/* 왼쪽: 제품 정보 패널 */}
            <Flex direction="col" gap={2} flex1 className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                제품 정보
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { label: '고객사', value: selectedResult.customerCompanyName },
                    { label: '제품명', value: selectedResult.productName },
                    {
                      label: '요청 납기',
                      value: new Date(selectedResult.requestDueDate).toLocaleDateString('ko-KR'),
                    },
                    {
                      label: '제안 납기',
                      value: selectedResult.simulation.suggestedDueDate,
                      valueClass:
                        selectedResult.simulation.status === 'FAIL'
                          ? 'text-red-500'
                          : 'text-gray-700',
                    },
                    {
                      label: '부족 사유',
                      value: selectedResult.simulation.shortageReason || '-',
                      valueClass: selectedResult.simulation.shortageReason
                        ? 'text-red-500'
                        : 'text-gray-400',
                    },
                  ] as { label: string; value: string; valueClass?: string }[]
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
              const isPass = status === 'PASS';
              return (
                <Flex
                  direction="col"
                  gap={1}
                  className="w-44 border border-gray-100 rounded-xl p-3"
                >
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    수량 분석
                  </p>
                  <Flex direction="col" gap={1} className="bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-400">요청 수량</span>
                    <span className="font-medium text-sm text-gray-700">
                      {selectedResult.requestQuantity.toLocaleString()} EA
                    </span>
                  </Flex>
                  <p className="text-center text-gray-300 text-xs select-none">−</p>
                  <Flex direction="col" gap={1} className="bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-400">가용 수량</span>
                    <span className="font-medium text-sm text-gray-700">
                      {availableQuantity.toLocaleString()} EA
                    </span>
                  </Flex>
                  <p className="text-center text-gray-300 text-xs select-none">=</p>
                  <Flex
                    direction="col"
                    gap={1}
                    className={`rounded-lg px-3 py-2 ${isPass ? 'bg-green-50' : 'bg-red-50'}`}
                  >
                    <span className="text-xs text-gray-400">생산 필요량</span>
                    <span
                      className={`font-semibold text-sm ${isPass ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {shortageQuantity.toLocaleString()} EA
                    </span>
                    <span className={`text-xs ${isPass ? 'text-green-400' : 'text-red-400'}`}>
                      {isPass ? '생산 가능' : '생산 불가'}
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
        <Button label="MPS 생성하기" onClick={onConfirm} disabled={passCount === 0} />
      </Flex>
    </Flex>
  );
}
