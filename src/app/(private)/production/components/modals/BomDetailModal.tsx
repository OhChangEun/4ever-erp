import { type BomDetailResponse } from '@/app/(private)/production/types/BomDetailApiType';
import { fetchBomDetail } from '../../api/production.api';
import { useSimulateBomConflict, useUpdateBomStatus } from '../../api/production.mutations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ModalProps } from '@/app/components/common/modal/types';
import { formatDateTime } from '@/app/utils/date';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { isAppError } from '@/lib/AppError';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { useToast } from '@/app/components/common/toast/useToast';
import { ConflictDialog } from '@everp/ui';
import { bomKeys } from '@/app/(private)/production/api/production.keys';
import { useTranslations } from 'next-intl';

// D3 배치와 원가 롤업은 BOM 상세를 열 때만 받는다(시각화 7)
function TreeLoading() {
  const t = useTranslations('production.bomDetail');
  return (
    <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
      <p className="text-gray-500">{t('treeLoading')}</p>
    </div>
  );
}

const BomCostTree = dynamic(() => import('../bom/BomCostTree'), {
  ssr: false,
  loading: () => <TreeLoading />,
});

// 상태 뱃지 색. 글자는 메시지(production.bomDetail.statusBadge.<코드>)
const STATUS_BADGE: Partial<
  Record<string, { key: 'ACTIVE' | 'INACTIVE' | 'DRAFT'; class: string }>
> = {
  ACTIVE: { key: 'ACTIVE', class: 'bg-green-100 text-green-800' },
  INACTIVE: { key: 'INACTIVE', class: 'bg-gray-100 text-gray-800' },
  DRAFT: { key: 'DRAFT', class: 'bg-yellow-100 text-yellow-800' },
  // 목과 지금 화면은 상태를 한국어 글자로 주고받는다. 실제 서버(scm-pp)가 어느 쪽인지는
  // 게이트웨이 사본으로 확인이 안 돼 둘 다 받는다
  활성: { key: 'ACTIVE', class: 'bg-green-100 text-green-800' },
  비활성: { key: 'INACTIVE', class: 'bg-gray-100 text-gray-800' },
};

interface BomDetailModalProps extends ModalProps {
  bomId: string;
  /** 상태 토글과 충돌 재현 버튼. 실백엔드면 false(BomStatusActionsContext) */
  showStatusActions: boolean;
}

export default function BomDetailModal({ bomId, showStatusActions }: BomDetailModalProps) {
  const t = useTranslations('production');
  const queryClient = useQueryClient();
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const [showConflictModal, setShowConflictModal] = useState(false);

  const {
    data: bomDetail,
    isLoading,
    isError,
  } = useQuery<BomDetailResponse>({
    queryKey: bomKeys.detail(bomId),
    meta: { listOnNotFound: bomKeys.lists() },
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
        toast.error(t('bomDetail.updateError', { message: errorMessageOf(err) }));
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
    void queryClient.invalidateQueries({ queryKey: bomKeys.detail(bomId) });
  };

  const getStatusBadge = (status: string) => {
    // 모르는 상태가 오면 없음(undefined)이라 Partial. 모르는 상태는 값 그대로(예전과 같음)
    const badge = STATUS_BADGE[status];
    const config = badge
      ? { label: t(`bomDetail.statusBadge.${badge.key}`), class: badge.class }
      : { label: status, class: 'bg-gray-100 text-gray-800' };
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
          <p className="mt-3 text-gray-500">{t('common.loading')}</p>
        </div>
      ) : isError || !bomDetail ? (
        <div className="p-6 text-center py-12">
          <i className="ri-error-warning-line text-3xl text-red-400"></i>
          <p className="mt-3 text-red-500">{t('common.loadFailed')}</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* 제품 기본 정보 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">{t('bomDetail.basicInfo')}</h4>
              {showStatusActions && (
                <div className="flex gap-2">
                  {/* [테스트 전용] 다른 사용자가 수정한 상황 시뮬레이션 버튼 */}
                  <button
                    onClick={() => triggerConflict(bomId)}
                    disabled={isTriggering}
                    title={t('bomDetail.simulateConflictHint')}
                    className="px-3 py-1.5 text-xs rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                  >
                    <i className="ri-test-tube-line mr-1"></i>
                    {t('bomDetail.simulateConflict')}
                  </button>
                  {/* 상태 변경 버튼 — version을 함께 전송해 낙관적 락 검증 */}
                  <button
                    onClick={() => {
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
                    {bomDetail.statusCode === '활성'
                      ? t('bomDetail.deactivate')
                      : t('bomDetail.activate')}
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('common.productName')}
                </label>
                <p className="text-sm text-gray-900">{bomDetail.productName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('bomDetail.productCode')}
                </label>
                <p className="text-sm text-gray-900">{bomDetail.productNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('common.bomNumber')}</label>
                <p className="text-sm text-gray-900">{bomDetail.bomNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('common.version')}</label>
                <p className="text-sm text-gray-900">{bomDetail.version}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('common.status')}</label>
                <div className="mt-1">{getStatusBadge(bomDetail.statusCode)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('common.lastModified')}
                </label>
                <p className="text-sm text-gray-900">{formatDateTime(bomDetail.lastModifiedAt)}</p>
              </div>
            </div>
          </div>

          {/* 구성품 리스트 */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">
              {t('bomDetail.componentsTitle')}
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-center">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('bomDetail.itemCode')}
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('common.itemName')}
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('common.quantity')}
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('common.unit')}
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('bomDetail.level')}
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('common.supplier')}
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
            <h4 className="text-md font-semibold text-gray-900 mb-4">{t('bomDetail.treeTitle')}</h4>
            <BomCostTree bomData={bomDetail.levelStructure} />
          </div>

          {/* 공정 라우팅 정보 */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">
              {t('bomDetail.routingTitle')}
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('bomDetail.sequence')}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('common.itemName')}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('bomDetail.operationName')}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('bomDetail.runTime')}
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
