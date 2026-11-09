'use client';

import { FormEvent, useState, useId } from 'react';
import {
  AddWarehouseRequest,
  WarehouseManagerInfoResponse,
} from '../../types/AddWarehouseModalType';
import { useQuery } from '@tanstack/react-query';
import { getWarehouseManagerInfo } from '../../warehouse.api';
import { useAddWarehouse } from '../../warehouse.mutations';
import { ModalStatusBox } from '@everp/ui';
import { Button } from '@everp/ui';
import { ModalProps } from '@/app/components/common/modal/types';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';
import { warehouseManagerInfoKeys } from '@/app/(private)/warehouse/warehouse.keys';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';

const AddWarehouseModal = ({ onClose }: ModalProps) => {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const toast = useToast();
  const [formData, setFormData] = useState<AddWarehouseRequest>({
    warehouseName: '',
    warehouseType: '',
    location: '',
    managerId: '',
    managerPhone: '',
    note: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const { managerPhone, ...requestData } = formData;
    addWarehouse(requestData);
  };

  // ---------------------

  const {
    data: ManagerInfoRes,
    isLoading,
    isError,
  } = useQuery<WarehouseManagerInfoResponse[]>({
    queryKey: warehouseManagerInfoKeys.all,
    queryFn: getWarehouseManagerInfo,
  });
  // 생성이라 낙관적 업데이트를 하지 않는다(결정 7). 무효화는 warehouse.mutations.ts 한 곳.
  const { mutate: addWarehouse, isPending: isAdding } = useAddWarehouse({
    onSuccess: () => {
      toast.success('창고 등록이 완료되었습니다.');
      onClose();
    },
    onError: (error) => toast.error(`창고 등록 중 오류가 발생했습니다. ${errorMessageOf(error)}`),
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading)
    return <ModalStatusBox type="loading" message="담당자 정보를 불러오는 중입니다..." />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message="담당자 정보를 불러오는 중 오류가 발생했습니다."
        onClose={() => errorDialog.dismiss()}
      />
    );

  return (
    <form className="space-y-4">
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
          name="warehouseName"
          value={formData.warehouseName}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="창고명을 입력하세요"
          onChange={handleInputChange}
        />
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-warehouseType`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          창고 유형
        </label>
        <select
          id={`${fieldId}-warehouseType`}
          onChange={handleInputChange}
          name="warehouseType"
          value={formData.warehouseType}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
        >
          <option value="MATERIAL">원자재</option>
          <option value="ITEM">부품</option>
          <option value="ETC">기타 </option>
        </select>
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-location`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          위치
        </label>
        <input
          id={`${fieldId}-location`}
          type="text"
          name="location"
          onChange={handleInputChange}
          value={formData.location}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="창고 위치를 입력하세요"
        />
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-manager`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          담당자
        </label>
        <select
          id={`${fieldId}-manager`}
          onChange={(e) => {
            const managerId = e.target.value;
            const selectedManager = ManagerInfoRes?.find((m) => m.managerId === managerId);

            setFormData((prev) => ({
              ...prev,
              managerId,
              managerPhone: selectedManager?.managerPhone ?? '',
            }));
          }}
          name="manager"
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
          htmlFor={`${fieldId}-managerPhone`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          연락처
        </label>
        <input
          id={`${fieldId}-managerPhone`}
          onChange={handleInputChange}
          name="managerPhone"
          value={formData.managerPhone}
          type="tel"
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="연락처를 입력하세요"
        />
      </div>

      <div>
        <label htmlFor={`${fieldId}-note`} className="block text-sm font-medium text-gray-700 mb-1">
          설명
        </label>
        <textarea
          id={`${fieldId}-note`}
          value={formData.note}
          onChange={handleInputChange}
          name="note"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          rows={3}
        ></textarea>
      </div>

      <div className="flex gap-3 pt-4 justify-end">
        <button
          type="button"
          onClick={() => onClose()}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
        >
          취소
        </button>
        <Button
          type="submit"
          label="새 창고 추가"
          onClick={handleSubmit}
          loading={isAdding}
          className="w-[50%]"
        />
        {/* <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
            >
              추가
            </button> */}
      </div>
    </form>
  );
};

export default AddWarehouseModal;
