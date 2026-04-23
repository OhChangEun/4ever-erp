'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EditWarehouseRequest,
  ManageWarehouseModalProps,
} from '../../types/ManageWarehouseModalType';
import { InventoryDetailResponse } from '@/app/(private)/inventory/types/InventoryDetailModalType';
import { WarehouseDetailResponse } from '../../types/WarehouseDetailModalType';
import {
  getWarehouseDetail,
  getWarehouseManagerInfo,
  patchManageWarehouse,
} from '../../warehouse.api';
import { useEffect, useState } from 'react';
import { getStatusText } from '@/lib/status.constants';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { useToast } from '@/app/components/common/toast/useToast';
import { WarehouseManagerInfoResponse } from '../../types/AddWarehouseModalType';
import { ApiResponseNoData } from '@/app/types/api';
import { WarehouseListResponse } from '../../types/WarehouseListType';
import { Page } from '@/app/types/Page';

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

const ManageWarehouseModal = ({ onClose, $selectedWarehouseId }: ManageWarehouseModalProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formData, setFormData] = useState<ManageWarehouseRequest>({
    warehouseName: '',
    warehouseNumber: '',
    warehouseType: '',
    statusCode: '',
    location: '',
    managerId: '',
    managerName: '',
    managerPhoneNumber: '',
    managerEmail: '',
    description: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      warehouseName: formData.warehouseName,
      warehouseType: formData.warehouseType,
      location: formData.location,
      managerId: formData.managerId,
      warehouseStatusCode: formData.statusCode,
      note: formData.description ?? '',
    };
    editWarehouse({ warehouseId: $selectedWarehouseId, payload: data });
  };
  const {
    data: warehouseDetailRes,
    isLoading: isWarehouseInfoLoading,
    isError: isWarehouseInfoError,
  } = useQuery<WarehouseDetailResponse>({
    queryKey: ['warehouseDetail', $selectedWarehouseId],
    queryFn: () => getWarehouseDetail($selectedWarehouseId),
    enabled: !!$selectedWarehouseId,
  });

  const warehouseInfo = warehouseDetailRes?.warehouseInfo;
  const managerInfo = warehouseDetailRes?.manager;

  const {
    data: ManagerInfoRes,
    isLoading: isManagerInfoLoading,
    isError: isManagerInfoError,
  } = useQuery<WarehouseManagerInfoResponse[]>({
    queryKey: ['getWarehouseManagerInfo'],
    queryFn: getWarehouseManagerInfo,
  });

  // const { mutate: editWarehouse } = useMutation<
  //   ApiResponseNoData,
  //   Error,
  //   { warehouseId: string; payload: EditWarehouseRequest }
  // >({
  //   mutationFn: patchManageWarehouse,
  //   onSuccess: (data) => {
  //     alert(`${data.status} : ${data.message}`);
  //   },
  //   onError: (error) => {
  //     alert(`창고 수정 중 오류가 발생했습니다. ${error}`);
  //   },
  // });

  const { mutate: editWarehouse } = useMutation<
    ApiResponseNoData,
    Error,
    {
      warehouseId: string;
      payload: EditWarehouseRequest;
    },
    { previousData?: { data: WarehouseListResponse[]; pageData: Page } }
  >({
    mutationFn: patchManageWarehouse,

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

    onError: (_error, _variables, context) => {
      if (context?.previousData) queryClient.setQueryData(['warehouseList'], context.previousData);
      toast.error('창고 수정 중 오류가 발생했습니다.');
    },

    onSuccess: () => {
      toast.success('창고 수정이 완료되었습니다.');
      onClose();
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouseList'] });
    },
  });

  useEffect(() => {
    if (warehouseInfo && managerInfo && ManagerInfoRes?.length) {
      let matched = ManagerInfoRes.find((m) => m.managerId === managerInfo.managerId);

      if (!matched) {
        matched = ManagerInfoRes.find((m) => m.managerName === managerInfo.managerName);
      }

      setFormData({
        warehouseName: warehouseInfo.warehouseName ?? '',
        warehouseNumber: warehouseInfo.warehouseNumber ?? '',
        warehouseType: warehouseInfo.warehouseType ?? '',
        statusCode: warehouseInfo.statusCode ?? '',
        location: warehouseInfo.location ?? '',
        managerId: matched?.managerId ?? managerInfo.managerId ?? '',
        managerName: managerInfo.managerName ?? '',
        managerPhoneNumber: managerInfo.managerPhoneNumber ?? '',
        managerEmail: managerInfo.managerEmail ?? '',
        description: warehouseInfo.description ?? '',
      });
    }
  }, [warehouseInfo, managerInfo, ManagerInfoRes]);

  const [errorModal, setErrorModal] = useState(false);

  useEffect(() => {
    setErrorModal(isWarehouseInfoError || isManagerInfoError);
  }, [isWarehouseInfoError, isManagerInfoError]);

  if (isWarehouseInfoLoading)
    return <ModalStatusBox $type="loading" $message="창고 정보를 불러오는 중입니다..." />;

  if (isManagerInfoLoading)
    return <ModalStatusBox $type="loading" $message="담당자 정보를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        $type="error"
        $message="담당자 정보를 불러오는 중 오류가 발생했습니다."
        $onClose={() => setErrorModal(false)}
      />
    );

  if (errorModal)
    return (
      <ModalStatusBox
        $type="error"
        $message="창고 정보를 불러오는 중 오류가 발생했습니다."
        $onClose={() => setErrorModal(false)}
      />
    );

  return (
    <form className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">창고명</label>
          <input
            type="text"
            value={formData.warehouseName}
            onChange={handleInputChange}
            name="warehouseName"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">창고 코드</label>
          <input
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
          <label className="block text-sm font-medium text-gray-700 mb-1">창고 유형</label>
          <select
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
          <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select
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
        <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
        <input
          type="text"
          value={formData.location}
          onChange={handleInputChange}
          name="location"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
          <select
            onChange={(e) => {
              const managerId = e.target.value;
              const selectedManager = ManagerInfoRes?.find((m) => m.managerId === managerId);

              setFormData((prev) => ({
                ...prev,
                managerId,
                managerPhoneNumber: selectedManager?.managerPhone ?? '',
                managerEmail: selectedManager?.managerEmail ?? '',
              }));
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
          <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
          <input
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
        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
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
        <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
        <textarea
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
          // type="submit"
          onClick={handleSubmit}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
        >
          저장
        </button>
      </div>
    </form>
  );
};

export default ManageWarehouseModal;
