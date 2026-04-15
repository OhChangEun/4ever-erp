'use client';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { QuotationSimulationData } from '@/app/(private)/production/types/QuotationSimulationApiType';
import { fetchQuotationPreview } from '@/app/(private)/production/api/production.api';
import { QuotationPreviewResponse } from '@/app/(private)/production/types/QuotationPreviewApiType';
import Button from '@/app/components/common/Button';
import Flex from '@/app/components/common/Flex';
import StatusLabel from '@/app/components/common/StatusLabel';
import Table from '@/app/components/common/Table';
import { ModalProps } from '@/app/components/common/modal/types';

interface SimulationResultModalProps extends ModalProps {
  simulationResults: QuotationSimulationData[];
  selectedQuotes?: string[];
  onConfirm: (previewData: QuotationPreviewResponse) => void;
}

export default function SimulationResultModal({
  simulationResults,
  onConfirm,
}: SimulationResultModalProps) {
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    simulationResults[0]?.quotationId || null,
  );
  const previewMutation = useMutation({
    mutationFn: (params: string[]) => fetchQuotationPreview(params),
    onSuccess: (data) => onConfirm(data),
    onError: (error) => {
      console.error('MPS 프리뷰 조회 실패:', error);
      alert('MPS 프리뷰를 가져오는데 실패했습니다.');
    },
  });

  const passResults = simulationResults.filter((r) => r.simulation.status === 'PASS');
  const passCount = passResults.length;
  const selectedResult = simulationResults.find((r) => r.quotationId === selectedQuotationId);

  return (
    <Flex direction="col" gap={4} className="h-full">
      {/* 시뮬레이션 결과 테이블 */}
      <Flex direction="col" gap={3} className="flex-1 overflow-hidden">
        <h4 className="text-sm font-medium px-1 text-gray-700">생산 검토 현황</h4>
        <div className="flex-1 overflow-auto">
          <Table
            maxHeight="300px"
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
        <div className="pt-4">
          <Flex align="center" justify="between" className="mb-3">
            <h4 className="text-sm font-medium px-1 text-gray-700">상세 정보</h4>
          </Flex>

          <div className="grid grid-cols-3 gap-2 text-sm">
            {/* 1행: 고객사 - 요청 수량 - 요청 납기 */}
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <span className="block text-xs text-gray-400 mb-0.5">고객사</span>
              <span className="font-medium text-sm text-gray-700">{selectedResult.customerCompanyName}</span>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <span className="block text-xs text-gray-400 mb-0.5">요청 수량</span>
              <span className="font-medium text-sm text-gray-700">{selectedResult.requestQuantity.toLocaleString()} EA</span>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <span className="block text-xs text-gray-400 mb-0.5">요청 납기</span>
              <span className="font-medium text-sm text-gray-700">{new Date(selectedResult.requestDueDate).toLocaleDateString('ko-KR')}</span>
            </div>
            {/* 2행: 제품명 - 가용 수량 - 제안 납기 */}
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <span className="block text-xs text-gray-400 mb-0.5">제품명</span>
              <span className="font-medium text-sm text-gray-700">{selectedResult.productName}</span>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <span className="block text-xs text-gray-400 mb-0.5">가용 수량</span>
              <span className="font-medium text-sm text-gray-700">{selectedResult.simulation.availableQuantity.toLocaleString()} EA</span>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <span className="block text-xs text-gray-400 mb-0.5">제안 납기</span>
              <span className={`font-medium text-sm ${selectedResult.simulation.status === 'FAIL' ? 'text-red-500' : 'text-gray-700'}`}>{selectedResult.simulation.suggestedDueDate}</span>
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <Flex justify="end" gap={3} className="pt-4">
        <Button
          label={previewMutation.isPending ? 'MPS 생성 중...' : 'MPS 생성하기'}
          onClick={() => previewMutation.mutate(passResults.map((r) => r.quotationId))}
          disabled={previewMutation.isPending || passCount === 0}
        />
      </Flex>
    </Flex>
  );
}
