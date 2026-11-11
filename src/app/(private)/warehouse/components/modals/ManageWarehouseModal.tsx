'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type ManageWarehouseModalProps } from '../../types/ManageWarehouseModalType';
import { type WarehouseDetailResponse } from '../../types/WarehouseDetailModalType';
import { getWarehouseDetail, getWarehouseManagerInfo } from '../../warehouse.api';
import { useEditWarehouse } from '../../warehouse.mutations';
import { useState, useId } from 'react';
import { ModalStatusBox } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { type WarehouseManagerInfoResponse } from '../../types/AddWarehouseModalType';
import { warehouseKeys, warehouseManagerInfoKeys } from '@/app/(private)/warehouse/warehouse.keys';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import { useInventoryLabels } from '@/app/(private)/inventory';
import {
  WAREHOUSE_TYPE_OPTIONS,
  isWarehouseTypeOption,
  toWarehouseRequestType,
} from '../../warehouse.constants';

interface ManageWarehouseRequest {
  warehouseName: string;
  warehouseNumber: string;
  warehouseType: string;
  statusCode: string;
  location: string;
  managerId: string;
  managerName: string;
  managerPhoneNumber: string;
  managerEmail: string;
  description: string;
}

const ManageWarehouseModal = ({ onClose, selectedWarehouseId }: ManageWarehouseModalProps) => {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const t = useTranslations('warehouse');
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const { warehouseTypeLabel } = useInventoryLabels();
  // 서버 값으로 한 번만 채우는 초안. 채운 뒤의 재조회는 입력을 덮지 않는다(예전엔 effect 가 매번 덮었다)
  const [formData, setFormData] = useState<ManageWarehouseRequest | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    const data = {
      warehouseName: formData.warehouseName,
      warehouseType: formData.warehouseType,
      location: formData.location,
      managerId: formData.managerId,
      warehouseStatusCode: formData.statusCode,
      note: formData.description,
    };
    editWarehouse({ warehouseId: selectedWarehouseId, payload: data });
  };
  const {
    data: warehouseDetailRes,
    isLoading: isWarehouseInfoLoading,
    isError: isWarehouseInfoError,
  } = useQuery<WarehouseDetailResponse>({
    queryKey: warehouseKeys.detail(selectedWarehouseId),
    queryFn: () => getWarehouseDetail(selectedWarehouseId),
    enabled: !!selectedWarehouseId,
  });

  const warehouseInfo = warehouseDetailRes?.warehouseInfo;
  const managerInfo = warehouseDetailRes?.manager;

  const {
    data: ManagerInfoRes,
    isLoading: isManagerInfoLoading,
    isError: isManagerInfoError,
  } = useQuery<WarehouseManagerInfoResponse[]>({
    queryKey: warehouseManagerInfoKeys.all,
    queryFn: getWarehouseManagerInfo,
  });

  // 낙관적 업데이트(목록 행의 이름, 유형, 위치, 상태)와 무효화는 warehouse.mutations.ts 한 곳.
  const { mutate: editWarehouse, isPending: isEditing } = useEditWarehouse({
    onSuccess: () => {
      toast.success(t('manage.success'));
      onClose();
    },
    onError: (error) => toast.error(t('manage.error', { message: errorMessageOf(error) })),
  });

  // 세 조회가 다 오면 렌더 중에 한 번 채운다. 담당자 목록이 비어 있어도 상세의 담당자로 채운다
  if (formData === null && warehouseInfo && managerInfo && ManagerInfoRes) {
    const matched =
      ManagerInfoRes.find((m) => m.managerId === managerInfo.managerId) ??
      ManagerInfoRes.find((m) => m.managerName === managerInfo.managerName);
    setFormData({
      warehouseName: warehouseInfo.warehouseName ?? '',
      warehouseNumber: warehouseInfo.warehouseNumber,
      // RAW 같은 원자재 별칭은 요청 코드 MATERIAL 로 채운다. 그대로 두면 옵션이 없어 화면은 원자재를 보이는데 RAW 를 보냈다
      warehouseType: toWarehouseRequestType(warehouseInfo.warehouseType),
      statusCode: warehouseInfo.statusCode,
      location: warehouseInfo.location ?? '',
      managerId: matched?.managerId ?? managerInfo.managerId,
      managerName: managerInfo.managerName ?? '',
      managerPhoneNumber: managerInfo.managerPhoneNumber ?? '',
      managerEmail: managerInfo.managerEmail ?? '',
      description: warehouseInfo.description ?? '',
    });
  }

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isWarehouseInfoError, isManagerInfoError);

  // 요청 목록(MATERIAL, ITEM, ETC)에 없는 유형은 옵션으로 하나 더 둔다. 없으면 select 가 첫 옵션을 보여
  // 화면과 보낼 값이 달라진다. 서버 값과 초안 둘 다 남겨 다른 유형을 골랐다가 되돌릴 수 있다
  const servedType = warehouseInfo
    ? toWarehouseRequestType(warehouseInfo.warehouseType)
    : undefined;
  const keptTypes = [...new Set([servedType, formData?.warehouseType])].filter(
    (type): type is string => type !== undefined && !isWarehouseTypeOption(type),
  );

  if (isWarehouseInfoLoading)
    return <ModalStatusBox type="loading" message={t('manage.loading')} />;

  if (isManagerInfoLoading)
    return <ModalStatusBox type="loading" message={t('managerInfo.loading')} />;

  // 두 조회 중 무엇이 실패했는지 한 창에 적는다(예전엔 같은 조건의 분기가 둘이라 두 번째는 닿지 않았다)
  const loadErrorMessage = isWarehouseInfoError
    ? t('manage.loadError')
    : t('managerInfo.loadError');

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message={loadErrorMessage}
        onClose={() => errorDialog.dismiss()}
      />
    );

  // 조회가 실패한 채로 빈 폼을 띄우면 빈 값이 저장될 수 있다. 닫은 뒤에도 폼 대신 오류를 둔다
  if (formData === null)
    return isWarehouseInfoError || isManagerInfoError ? (
      <ModalStatusBox type="error" message={loadErrorMessage} onClose={onClose} />
    ) : (
      <ModalStatusBox type="loading" message={t('manage.loading')} />
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${fieldId}-warehouseName`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('form.name')}
          </label>
          <input
            id={`${fieldId}-warehouseName`}
            type="text"
            value={formData.warehouseName}
            onChange={handleInputChange}
            name="warehouseName"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-warehouseNumber`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('form.code')}
          </label>
          <input
            id={`${fieldId}-warehouseNumber`}
            readOnly
            disabled
            type="text"
            value={formData.warehouseNumber}
            onChange={handleInputChange}
            name="warehouseNumber"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${fieldId}-warehouseType`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('form.type')}
          </label>
          <select
            id={`${fieldId}-warehouseType`}
            value={formData.warehouseType}
            onChange={handleInputChange}
            name="warehouseType"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
          >
            {keptTypes.map((type) => (
              <option key={type} value={type}>
                {/* 빈 값은 예전 등록 버그(초기값 빈 문자열)가 남긴 창고다. 이름만 붙이고 값은 그대로 둔다 */}
                {type === '' ? t('form.typeUnspecified') : warehouseTypeLabel(type)}
              </option>
            ))}
            {WAREHOUSE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`warehouseType.${option}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-statusCode`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('form.status')}
          </label>
          <select
            id={`${fieldId}-statusCode`}
            value={formData.statusCode}
            onChange={handleInputChange}
            name="statusCode"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
          >
            <option value="ACTIVE">{t('statusOption.ACTIVE')}</option>
            <option value="INACTIVE">{t('statusOption.INACTIVE')}</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-location`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t('form.address')}
        </label>
        <input
          id={`${fieldId}-location`}
          type="text"
          value={formData.location}
          onChange={handleInputChange}
          name="location"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${fieldId}-managerId`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('form.manager')}
          </label>
          <select
            id={`${fieldId}-managerId`}
            onChange={(e) => {
              const managerId = e.target.value;
              const selectedManager = ManagerInfoRes?.find((m) => m.managerId === managerId);

              setFormData((prev) =>
                prev
                  ? {
                      ...prev,
                      managerId,
                      managerPhoneNumber: selectedManager?.managerPhone ?? '',
                      managerEmail: selectedManager?.managerEmail ?? '',
                    }
                  : prev,
              );
            }}
            name="managerId"
            value={formData.managerId}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
          >
            <option value="">{t('form.managerPlaceholder')}</option>
            {ManagerInfoRes?.map((manager) => (
              <option key={manager.managerId} value={manager.managerId}>
                {manager.managerName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-managerPhoneNumber`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('form.phone')}
          </label>
          <input
            id={`${fieldId}-managerPhoneNumber`}
            readOnly
            disabled
            type="tel"
            value={formData.managerPhoneNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              e.target.value = e.target.value.replace(/[^0-9-]/g, '');
              handleInputChange(e);
            }}
            inputMode="numeric"
            pattern="[0-9\-]*"
            name="managerPhoneNumber"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-managerEmail`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t('form.email')}
        </label>
        <input
          id={`${fieldId}-managerEmail`}
          readOnly
          disabled
          type="email"
          value={formData.managerEmail}
          onChange={handleInputChange}
          name="managerEmail"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-description`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t('form.note')}
        </label>
        <textarea
          id={`${fieldId}-description`}
          value={formData.description}
          onChange={handleInputChange}
          name="description"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          rows={3}
        ></textarea>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => onClose()}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
        >
          {t('form.cancel')}
        </button>
        <button
          type="submit"
          disabled={isEditing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEditing ? t('form.saving') : t('form.save')}
        </button>
      </div>
    </form>
  );
};

export default ManageWarehouseModal;
