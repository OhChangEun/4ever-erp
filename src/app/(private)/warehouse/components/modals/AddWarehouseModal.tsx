'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  AddWarehouseRequest,
  WarehouseManagerInfoResponse,
} from '../../types/AddWarehouseModalType';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWarehouseManagerInfo, postAddWarehouse } from '../../warehouse.api';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { Page } from '@/app/types/Page';
import { WarehouseListResponse } from '../../types/WarehouseListType';
import Button from '@/app/components/common/Button';
import { ModalProps } from '@/app/components/common/modal/types';
import { useToast } from '@/app/components/common/toast/useToast';

const AddWarehouseModal = ({ onClose }: ModalProps) => {
  const queryClient = useQueryClient();
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
    queryKey: ['getWarehouseManagerInfo'],
    queryFn: getWarehouseManagerInfo,
  });
  // 낙관적 업데이트x
  // const { mutate: addWarehouse } = useMutation<ApiResponseNoData, Error, AddWarehouseRequest>({
  //   mutationFn: postAddWarehouse,
  //   onSuccess: (data) => {
  //     alert(`${data.status} : ${data.message}
  //     `);
  //     onClose()
  //   },
  //   onError: (error) => {
  //     alert(` 자재 등록 중 오류가 발생했습니다. ${error}`);
  //   },
  // });

  // 낙관적 업데이트
  const { mutate: addWarehouse } = useMutation({
    mutationFn: postAddWarehouse,

    onMutate: async (newWarehouse) => {
      await queryClient.cancelQueries({ queryKey: ['warehouseList'] });

      const previousData = queryClient.getQueryData<{
        data: WarehouseListResponse[];
        pageData: Page;
      }>(['warehouseList']);

      queryClient.setQueryData<{ data: WarehouseListResponse[]; pageData: Page }>(
        ['warehouseList'],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: [newWarehouse as unknown as WarehouseListResponse, ...oldData.data],
          };
        },
      );

      return { previousData };
    },

    onError: (_error, _newWarehouse, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['warehouseList'], context.previousData);
      }
      toast.error('창고 등록 중 오류가 발생했습니다.');
    },

    onSuccess: () => {
      toast.success('창고 등록이 완료되었습니다.');
      onClose();
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouseList'] });
    },
  });

  const [errorModal, setErrorModal] = useState(false);
  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  if (isLoading)
    return <ModalStatusBox $type="loading" $message="담당자 정보를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        $type="error"
        $message="담당자 정보를 불러오는 중 오류가 발생했습니다."
        $onClose={() => setErrorModal(false)}
      />
    );

  return (
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">창고명</label>
        <input
          type="text"
          name="warehouseName"
          value={formData.warehouseName}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="창고명을 입력하세요"
          onChange={handleInputChange}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">창고 유형</label>
        <select
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
        <label className="block text-sm font-medium text-gray-700 mb-1">위치</label>
        <input
          type="text"
          name="location"
          onChange={handleInputChange}
          value={formData.location}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="창고 위치를 입력하세요"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
        <select
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
        <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
        <input
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
        <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
        <textarea
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
        <Button type="submit" label="새 창고 추가" onClick={handleSubmit} className="w-[50%]" />
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
