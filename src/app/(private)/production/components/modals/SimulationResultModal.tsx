'use client';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { QuotationSimulationData } from '@/app/(private)/production/types/QuotationSimulationApiType';
import { fetchQuotationPreview } from '@/app/(private)/production/api/production.api';
import {
  FetchQuotationPreviewParams,
  QuotationPreviewResponse,
} from '@/app/(private)/production/types/QuotationPreviewApiType';
import Button from '@/app/components/common/Button';
import Spacing from '@/app/components/common/Spacing';
import Table from '@/app/components/common/Table';
import { ModalProps } from '@/app/components/common/modal/types';

interface SimulationResultModalProps extends ModalProps {
  simulationResults: QuotationSimulationData[];
  selectedQuotes: string[];
  onConfirm: (previewData: QuotationPreviewResponse) => void;
}

export default function SimulationResultModal({
  simulationResults,
  selectedQuotes,
  onClose,
  onConfirm,
}: SimulationResultModalProps) {
  // 선택된 견적 ID (테이블 row 클릭)
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    simulationResults[0]?.quotationId || null,
  );

  // 조달 예상일 입력 상태 (FAIL 항목들)
  const [deliveryDates, setDeliveryDates] = useState<Record<string, string>>({});

  const previewMutation = useMutation({
    mutationFn: (params: string[]) => fetchQuotationPreview(params),
    onSuccess: (data) => {
      onConfirm(data);
    },
    onError: (error) => {
      console.error('MPS 프리뷰 조회 실패:', error);
      alert('MPS 프리뷰를 가져오는데 실패했습니다.');
    },
  });

  const handleConfirmClick = () => {
    previewMutation.mutate(selectedQuotes);
  };

  const getStatusIcon = (status: string) => {
    return status === 'PASS' ? '🟢' : '🔴';
  };

  // 통계 계산
  const passCount = simulationResults.filter((r) => r.simulation.status === 'PASS').length;
  const failCount = simulationResults.length - passCount;

  // 선택된 견적 데이터
  const selectedResult = simulationResults.find((r) => r.quotationId === selectedQuotationId);

  // FAIL 항목들
  const failedResults = simulationResults.filter((r) => r.simulation.status === 'FAIL');

  // 부족 사유 텍스트 (첫 번째 부족 자재 + 부족 수량)
  const getShortageText = (result: QuotationSimulationData) => {
    if (!result.shortages || result.shortages.length === 0) return '-';
    const first = result.shortages[0];
    return `${first.itemName} (부족: ${(first.shortQuantity / 1000).toFixed(1)}k)`;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 요약 섹션 */}
      <div className="card-base p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
        <h3 className="text-sm font-bold text-gray-700 mb-4">시뮬레이션 결과 요약</h3>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <span className="text-3xl font-bold text-gray-900">{simulationResults.length}</span>
            <span className="block text-xs text-gray-600 mt-1">총 견적</span>
          </div>
          <Spacing size={3} direction="horizontal" className="border-l-2 border-blue-200" />
          <div className="text-center">
            <span className="text-3xl font-bold text-green-600">{passCount}</span>
            <span className="block text-xs text-gray-600 mt-1">생산 가능</span>
          </div>
          <Spacing size={3} direction="horizontal" className="border-l-2 border-blue-200" />
          <div className="text-center">
            <span className="text-3xl font-bold text-red-600">{failCount}</span>
            <span className="block text-xs text-gray-600 mt-1">조달 필요</span>
          </div>
        </div>
      </div>

      {/* 시뮬레이션 결과 테이블 */}
      <div className="flex-1 overflow-hidden flex flex-col gap-3">
        <h4 className="text-sm font-bold text-gray-700">생산 검토 현황</h4>
        <div className="flex-1 overflow-auto border rounded-lg bg-white">
          <Table
            columns={[
              {
                key: 'quotationNumber',
                label: '견적번호',
                render: (_, row: QuotationSimulationData) => (
                  <span className="font-medium text-blue-600">{row.quotationNumber}</span>
                ),
              },
              {
                key: 'customerCompanyName',
                label: '고객사',
                width: '120px',
              },
              {
                key: 'productName',
                label: '제품명',
                width: '150px',
              },
              {
                key: 'status',
                label: '상태',
                width: '80px',
                render: (_, row: QuotationSimulationData) => (
                  <div className="flex items-center gap-2">
                    <span>{getStatusIcon(row.simulation.status)}</span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        row.simulation.status === 'PASS'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {row.simulation.status === 'PASS' ? '가능' : '조달'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'shortage',
                label: '부족 사유',
                width: '200px',
                render: (_, row: QuotationSimulationData) => (
                  <span className="text-xs text-gray-600">{getShortageText(row)}</span>
                ),
              },
              {
                key: 'suggestedDueDate',
                label: '제안 납기',
                width: '100px',
                render: (_, row: QuotationSimulationData) => (
                  <span className="text-sm">{row.simulation.suggestedDueDate}</span>
                ),
              },
            ]}
            data={simulationResults}
            onRowClick={(row) => setSelectedQuotationId((row as QuotationSimulationData).quotationId)}
            emptyMessage="시뮬레이션 결과가 없습니다."
          />
        </div>
      </div>

      {/* 선택된 견적 상세 정보 */}
      {selectedResult && (
        <div className="border-t-2 border-gray-200 pt-4">
          <h4 className="text-sm font-bold text-gray-700 mb-3">상세 정보</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-gray-500 text-xs mb-1">고객사</span>
              <span className="font-semibold text-gray-900">{selectedResult.customerCompanyName}</span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs mb-1">제품</span>
              <span className="font-semibold text-gray-900">{selectedResult.productName}</span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs mb-1">요청 수량</span>
              <span className="font-semibold text-gray-900">
                {selectedResult.requestQuantity.toLocaleString()} EA
              </span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs mb-1">요청 납기</span>
              <span className="font-semibold text-gray-900">
                {new Date(selectedResult.requestDueDate).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs mb-1">가용 수량</span>
              <span className="font-semibold text-gray-900">
                {(selectedResult.simulation.availableQuantity / 1000).toFixed(1)}k EA
              </span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs mb-1">제안 납기</span>
              <span className="font-semibold text-gray-900">
                {selectedResult.simulation.suggestedDueDate}
              </span>
            </div>
          </div>

          {/* 부족 재고 테이블 */}
          {selectedResult.shortages && selectedResult.shortages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-xs font-bold text-red-600 mb-2">⚠️ 부족 재고 상세</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                      <th className="text-left px-2 py-2 text-gray-600 font-semibold">자재명</th>
                      <th className="text-right px-2 py-2 text-gray-600 font-semibold">필요</th>
                      <th className="text-right px-2 py-2 text-gray-600 font-semibold">현재</th>
                      <th className="text-right px-2 py-2 text-gray-600 font-semibold">부족</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResult.shortages.map((shortage, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-red-50">
                        <td className="px-2 py-2 text-gray-900">{shortage.itemName}</td>
                        <td className="text-right px-2 py-2 text-gray-900">
                          {(shortage.requiredQuantity / 1000).toFixed(1)}k
                        </td>
                        <td className="text-right px-2 py-2 text-gray-900">
                          {(shortage.currentStock / 1000).toFixed(1)}k
                        </td>
                        <td className="text-right px-2 py-2 font-bold text-red-600">
                          {(shortage.shortQuantity / 1000).toFixed(1)}k
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 조달 예상일 입력 (FAIL 항목들) */}
      {failedResults.length > 0 && (
        <div className="border-t-2 border-gray-200 pt-4">
          <h4 className="text-sm font-bold text-gray-700 mb-3">조달 예상일 확인</h4>
          <div className="space-y-2">
            {failedResults.map((result) => (
              <div
                key={result.quotationId}
                className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
              >
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{result.quotationNumber}</span>
                  <span className="text-xs text-gray-600 ml-2">- {result.productName}</span>
                </div>
                <input
                  type="date"
                  value={deliveryDates[result.quotationId] || ''}
                  onChange={(e) =>
                    setDeliveryDates((prev) => ({
                      ...prev,
                      [result.quotationId]: e.target.value,
                    }))
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder="조달 예상일"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button label="닫기" onClick={onClose} variant="secondary" />
        <Button
          label={previewMutation.isPending ? 'MPS 생성 중...' : 'MPS 생성하기'}
          onClick={handleConfirmClick}
          disabled={previewMutation.isPending || failedResults.length > 0 && Object.keys(deliveryDates).length < failedResults.length}
        />
      </div>
    </div>
  );
}
