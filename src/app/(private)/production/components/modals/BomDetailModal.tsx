import { BomDetailResponse } from '@/app/(private)/production/types/BomDetailApiType';
import { fetchBomDetail } from '../../api/production.api';
import { useSimulateBomConflict, useUpdateBomStatus } from '../../api/production.mutations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ModalProps } from '@/app/components/common/modal/types';
import { formatDateTime } from '@/app/utils/date';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { errorMessageOf, isAppError } from '@/lib/AppError';
import { useToast } from '@/app/components/common/toast/useToast';
import { ConflictDialog } from '@everp/ui';
import { bomKeys } from '@/app/(private)/production/api/production.keys';

const BomTreeContainer = dynamic(() => import('../../BomTreeContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
      <p className="text-gray-500">BOM 트리를 준비하는 중...</p>
    </div>
  ),
});

interface BomDetailModalProps extends ModalProps {
  bomId: string;
}

export default function BomDetailModal({ bomId }: BomDetailModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showConflictModal, setShowConflictModal] = useState(false);

  const {
    data: bomDetail,
    isLoading,
    isError,
  } = useQuery<BomDetailResponse>({
    queryKey: bomKeys.detail(bomId),
    queryFn: () => fetchBomDetail(bomId),
    enabled: !!bomId,
  });

  // BOM 상태 변경. version 을 같이 보내 낙관적 락. 무효화 범위는 production.mutations.ts.
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateBomStatus({
    onError: (err) => {
      if (isAppError(err) && err.kind === 'conflict') {
        // 409 Conflict → 다른 사용자가 먼저 수정한 경우
        setShowConflictModal(true);
      } else {
        toast.error(`BOM 수정 중 오류가 발생했습니다. ${errorMessageOf(err)}`);
      }
    },
  });

  // [테스트 전용] 서버 버전을 강제로 올려서 충돌 상황 재현
  const { mutate: triggerConflict, isPending: isTriggering } = useSimulateBomConflict({
    onSuccess: (data) => toast.info(data.message),
  });

  // 충돌 발생 시 최신 데이터 재조회 후 모달 닫기
  const handleConflictReload = () => {
    setShowConflictModal(false);
    queryClient.invalidateQueries({ queryKey: bomKeys.detail(bomId) });
  };

  // const renderLevelStructure = (levelStructure: BomDetailResponse['levelStructure']) => {
  //   return (
  //     <div className="space-y-4">
  //       {Object.entries(levelStructure).map(([level, items]) => (
  //         <div
  //           key={level}
  //           className="ml-4"
  //           style={{ marginLeft: `${parseInt(level.replace('Level ', '')) * 20}px` }}
  //         >
  //           <div className="text-sm font-medium text-gray-600 mb-2">{level}</div>
  //           {items.map((item) => (
  //             <div
  //               key={item.code}
  //               className="flex items-center space-x-2 p-2 bg-gray-50 rounded mb-1"
  //             >
  //               <i className="ri-arrow-right-s-line text-gray-400"></i>
  //               <span className="font-medium">{item.code}</span>
  //               <span>{item.name}</span>
  //               <span className="text-sm text-gray-500">{item.quantity}</span>
  //             </div>
  //           ))}
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; class: string }> = {
      ACTIVE: { label: '활성', class: 'bg-green-100 text-green-800' },
      INACTIVE: { label: '비활성', class: 'bg-gray-100 text-gray-800' },
      DRAFT: { label: '초안', class: 'bg-yellow-100 text-yellow-800' },
    };
    const config = statusConfig[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.class}`}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      {/* 409 충돌 안내. 영향 키 재조회는 공통 빌더가 이미 했다 */}
      {showConflictModal && (
        <ConflictDialog
          subject="BOM"
          onClose={() => setShowConflictModal(false)}
          onReload={handleConflictReload}
        />
      )}
      {isLoading ? (
        <div className="p-6 text-center py-12">
          <i className="ri-loader-4-line animate-spin text-3xl text-gray-400"></i>
          <p className="mt-3 text-gray-500">로딩 중...</p>
        </div>
      ) : isError || !bomDetail ? (
        <div className="p-6 text-center py-12">
          <i className="ri-error-warning-line text-3xl text-red-400"></i>
          <p className="mt-3 text-red-500">데이터를 불러오는데 실패했습니다.</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* 제품 기본 정보 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">제품 기본 정보</h4>
              <div className="flex gap-2">
                {/* [테스트 전용] 다른 사용자가 수정한 상황 시뮬레이션 버튼 */}
                <button
                  onClick={() => triggerConflict(bomId)}
                  disabled={isTriggering}
                  title="서버 버전을 강제로 올려서 충돌 상황을 만듭니다"
                  className="px-3 py-1.5 text-xs rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                >
                  <i className="ri-test-tube-line mr-1"></i>
                  충돌 시뮬레이션
                </button>
                {/* 상태 변경 버튼 — version을 함께 전송해 낙관적 락 검증 */}
                <button
                  onClick={() => {
                    if (!bomDetail) return;
                    updateStatus({
                      bomId,
                      statusCode: bomDetail.statusCode === '활성' ? '비활성' : '활성',
                      version: bomDetail.version,
                    });
                  }}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? (
                    <i className="ri-loader-4-line animate-spin mr-1"></i>
                  ) : (
                    <i className="ri-toggle-line mr-1"></i>
                  )}
                  {bomDetail.statusCode === '활성' ? '비활성화' : '활성화'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">제품명</label>
                <p className="text-sm text-gray-900">{bomDetail.productName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">제품 코드</label>
                <p className="text-sm text-gray-900">{bomDetail.productNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">BOM 번호</label>
                <p className="text-sm text-gray-900">{bomDetail.bomNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">버전</label>
                <p className="text-sm text-gray-900">{bomDetail.version}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">상태</label>
                <div className="mt-1">{getStatusBadge(bomDetail.statusCode)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">최종 수정일</label>
                <p className="text-sm text-gray-900">{formatDateTime(bomDetail.lastModifiedAt)}</p>
              </div>
            </div>
          </div>

          {/* 구성품 리스트 */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">구성품 리스트</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-center">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      품목 코드
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      품목명
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">수량</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">단위</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">레벨</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      공급사
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bomDetail.components.map((comp) => (
                    <tr key={comp.itemId} className="text-center">
                      <td className="px-4 py-2 text-sm text-gray-900">{comp.code}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{comp.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{comp.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{comp.unit}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{comp.level}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{comp.supplierName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 레벨 구조 */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">BOM 트리 구조</h4>
            <BomTreeContainer bomData={bomDetail.levelStructure} />
          </div>

          {/* 공정 라우팅 정보 */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">공정 라우팅 정보</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      순서
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      품목명
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      공정명
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      가동시간(분)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bomDetail.routing.map((routing) => (
                    <tr key={routing.sequence} className="text-center">
                      <td className="px-4 py-2 text-sm text-gray-900">{routing.sequence}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{routing.itemName}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{routing.operationName}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{routing.runTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
