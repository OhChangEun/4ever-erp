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
import { ModalProps } from '@/app/components/common/modal/types';

interface SimulationResultModalProps extends ModalProps {
  simulationResults: QuotationSimulationData[];
  selectedQuotes: string[];
  // MPS Preview 데이터를 부모에게 전달
  onConfirm: (previewData: QuotationPreviewResponse) => void;
}

export default function SimulationResultModal({
  simulationResults,
  selectedQuotes,
  onClose,
  onConfirm,
}: SimulationResultModalProps) {
  // 카드 선택 상태
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    simulationResults[0]?.quotationId || null
  );

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

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 요약 섹션 */}
      <div className="card-base p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
        <h3 className="text-sm font-bold text-gray-700 mb-4">시뮬레이션 결과 요약</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <span className="text-3xl font-bold text-gray-900">{simulationResults.length}</span>
              <span className="block text-xs text-gray-600 mt-1">총 견적</span>
            </div>
            <Spacing size={3} direction="horizontal" className="border-l-2 border-blue-200" />
            <div className="text-center">
              <span className="text-3xl font-bold text-green-600">{passCount}</span>
              <span className="block text-xs text-gray-600 mt-1">충족 가능</span>
            </div>
            <Spacing size={3} direction="horizontal" className="border-l-2 border-blue-200" />
            <div className="text-center">
              <span className="text-3xl font-bold text-red-600">{failCount}</span>
              <span className="block text-xs text-gray-600 mt-1">부족</span>
            </div>
          </div>
        </div>
      </div>

      {/* 카드 그리드 섹션 */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-4">견적 목록 {'(' + simulationResults.length + '개)'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2">
          {simulationResults.map((result) => (
            <button
              key={result.quotationId}
              onClick={() => setSelectedQuotationId(result.quotationId)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedQuotationId === result.quotationId
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-bold text-gray-900 truncate">
                  {result.quotationNumber}
                </span>
                <span className="text-xl ml-2">{getStatusIcon(result.simulation.status)}</span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="truncate">{result.customerCompanyName}</div>
                <div className="truncate">{result.productName}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">가용</span>
                  <span className="font-semibold text-gray-900">
                    {(result.simulation.availableQuantity / 1000).toFixed(1)}k EA
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 상세 정보 섹션 */}
      {selectedResult && (
        <div className="space-y-4 border-t-2 border-gray-200 pt-6">
          {/* 견적 정보 카드 */}
          <div className="card-base p-4 bg-gradient-to-br from-blue-50 to-white border-l-4 border-l-blue-500">
            <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">견적 정보</h4>
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
            </div>
          </div>

          {/* 시뮬레이션 결과 카드 */}
          <div
            className={`card-base p-4 border-l-4 ${
              selectedResult.simulation.status === 'PASS'
                ? 'bg-gradient-to-br from-green-50 to-white border-l-green-500'
                : 'bg-gradient-to-br from-red-50 to-white border-l-red-500'
            }`}
          >
            <h4 className="text-xs font-bold text-gray-600 uppercase mb-3 flex items-center">
              {getStatusIcon(selectedResult.simulation.status)} 시뮬레이션 결과
            </h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="block text-gray-500 text-xs mb-1">가용 수량</span>
                <span className="text-lg font-bold text-gray-900">
                  {(selectedResult.simulation.availableQuantity / 1000).toFixed(1)}k
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-xs mb-1">제안 납기</span>
                <span className="font-semibold text-gray-900">
                  {selectedResult.simulation.suggestedDueDate}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-xs mb-1">상태</span>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    selectedResult.simulation.status === 'PASS'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {selectedResult.simulation.status === 'PASS' ? '충족' : '부족'}
                </span>
              </div>
            </div>
          </div>

          {/* 부족 재고 카드 */}
          {selectedResult.shortages && selectedResult.shortages.length > 0 && (
            <div className="card-base p-4 bg-gradient-to-br from-orange-50 to-white border-l-4 border-l-orange-500">
              <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">⚠️ 부족 재고</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left px-2 py-2 text-gray-600 font-semibold">자재</th>
                      <th className="text-right px-2 py-2 text-gray-600 font-semibold">필요</th>
                      <th className="text-right px-2 py-2 text-gray-600 font-semibold">현재</th>
                      <th className="text-right px-2 py-2 text-gray-600 font-semibold">부족</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResult.shortages.map((shortage, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-orange-50">
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

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          label="닫기"
          onClick={onClose}
          variant="secondary"
        />
        <Button
          label={previewMutation.isPending ? 'MPS 프리뷰 로딩 중...' : '제안 납기 확정'}
          onClick={handleConfirmClick}
          disabled={previewMutation.isPending}
        />
      </div>
    </div>
  );
}
