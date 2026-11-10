'use client';

import { useQuery } from '@tanstack/react-query';
import { type ManageWarehouseModalProps } from '../../types/ManageWarehouseModalType';
import { type WarehouseDetailResponse } from '../../types/WarehouseDetailModalType';
import { getWarehouseDetail, getWarehouseManagerInfo } from '../../warehouse.api';
import { useEditWarehouse } from '../../warehouse.mutations';
import { useState, useId } from 'react';
import { ModalStatusBox } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';
import { type WarehouseManagerInfoResponse } from '../../types/AddWarehouseModalType';
import { warehouseKeys, warehouseManagerInfoKeys } from '@/app/(private)/warehouse/warehouse.keys';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';

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
  const toast = useToast();
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
      toast.success('창고 수정이 완료되었습니다.');
      onClose();
    },
    onError: (error) => toast.error(`창고 수정 중 오류가 발생했습니다. ${errorMessageOf(error)}`),
  });

  // 세 조회가 다 오면 렌더 중에 한 번 채운다. 담당자 목록이 비어 있어도 상세의 담당자로 채운다
  if (formData === null && warehouseInfo && managerInfo && ManagerInfoRes) {
    const matched =
      ManagerInfoRes.find((m) => m.managerId === managerInfo.managerId) ??
      ManagerInfoRes.find((m) => m.managerName === managerInfo.managerName);
    setFormData({
      warehouseName: warehouseInfo.warehouseName,
      warehouseNumber: warehouseInfo.warehouseNumber,
      warehouseType: warehouseInfo.warehouseType,
      statusCode: warehouseInfo.statusCode,
      location: warehouseInfo.location,
      managerId: matched?.managerId ?? managerInfo.managerId,
      managerName: managerInfo.managerName,
      managerPhoneNumber: managerInfo.managerPhoneNumber,
      managerEmail: managerInfo.managerEmail,
      description: warehouseInfo.description,
    });
  }

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isWarehouseInfoError, isManagerInfoError);

  if (isWarehouseInfoLoading)
    return <ModalStatusBox type="loading" message="창고 정보를 불러오는 중입니다..." />;

  if (isManagerInfoLoading)
    return <ModalStatusBox type="loading" message="담당자 정보를 불러오는 중입니다..." />;

  // 두 조회 중 무엇이 실패했는지 한 창에 적는다(예전엔 같은 조건의 분기가 둘이라 두 번째는 닿지 않았다)
  const loadErrorMessage = isWarehouseInfoError
    ? '창고 정보를 불러오는 중 오류가 발생했습니다.'
    : '담당자 정보를 불러오는 중 오류가 발생했습니다.';

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
      <ModalStatusBox type="loading" message="창고 정보를 불러오는 중입니다..." />
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${fieldId}-warehouseName`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            창고명
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
            창고 코드
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
            창고 유형
          </label>
          <select
            id={`${fieldId}-warehouseType`}
            value={formData.warehouseType}
            onChange={handleInputChange}
            name="warehouseType"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
          >
            <option value="MATERIAL">원자재</option>
            <option value="ITEM">부품</option>
            <option value="ETC">기타</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-statusCode`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            상태
          </label>
          <select
            id={`${fieldId}-statusCode`}
            value={formData.statusCode}
            onChange={handleInputChange}
            name="statusCode"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
          >
            <option value="ACTIVE">운영중</option>
            <option value="INACTIVE">비활성</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-location`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          주소
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
            담당자
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
            <option value="">창고 담당자를 선택하세요</option>
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
            연락처
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
          이메일
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
          설명
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
          취소
        </button>
        <button
          type="submit"
          disabled={isEditing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEditing ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
};

export default ManageWarehouseModal;
