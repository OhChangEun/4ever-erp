'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useInventoryLabels } from '@/app/(private)/inventory';
import {
  type WarehouseDetailModalProps,
  type WarehouseDetailResponse,
} from '../../types/WarehouseDetailModalType';
import { ModalStatusBox } from '@everp/ui';
import { getWarehouseDetail } from '../../warehouse.api';
import StatusLabel from '@/app/components/common/StatusLabel';
import { warehouseKeys } from '@/app/(private)/warehouse/warehouse.keys';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';

const WarehouseDetailModal = ({
  handleWarehouseManage,
  selectedWarehouseId,
  selectedWarehouseName,
}: WarehouseDetailModalProps) => {
  const { warehouseTypeLabel } = useInventoryLabels();
  const t = useTranslations('warehouse.detail');
  const {
    data: warehouseDetailRes,
    isLoading,
    isError,
  } = useQuery<WarehouseDetailResponse>({
    queryKey: warehouseKeys.detail(selectedWarehouseId),
    meta: { listOnNotFound: warehouseKeys.lists() },
    queryFn: () => getWarehouseDetail(selectedWarehouseId),
    enabled: !!selectedWarehouseId,
  });

  const warehouseInfo = warehouseDetailRes?.warehouseInfo;
  const managerInfo = warehouseDetailRes?.manager;

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox type="error" message={t('loadError')} onClose={() => errorDialog.dismiss()} />
    );
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">{t('basicInfo')}</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('name')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {warehouseInfo?.warehouseName ?? '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('code')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {warehouseInfo?.warehouseNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('type')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {warehouseTypeLabel(warehouseInfo?.warehouseType ?? '')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('status')}</span>
                {<StatusLabel statusCode={warehouseInfo?.statusCode} />}
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">{t('locationInfo')}</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600 block mb-1">{t('address')}</span>
                <span className="text-sm text-gray-900">{warehouseInfo?.location ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">{t('managerInfo')}</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('manager')}</span>
              <span className="text-sm font-medium text-gray-900">
                {managerInfo?.managerName ?? '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('phone')}</span>
              <span className="text-sm font-medium text-blue-600">
                {managerInfo?.managerPhoneNumber ?? '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('email')}</span>
              <span className="text-sm font-medium text-blue-600">
                {managerInfo?.managerEmail ?? '-'}
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">{t('description')}</h4>
            <p className="text-sm text-gray-700">{warehouseInfo?.description ?? '-'}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => {
            // setShowDetailModal(false);
            handleWarehouseManage(selectedWarehouseId, selectedWarehouseName);
          }}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
        >
          <i className="ri-edit-line mr-1"></i>
          {t('manage')}
        </button>
      </div>
    </>
  );
};

export default WarehouseDetailModal;
