'use client';

import { useState, useEffect } from 'react';
import {
  CreateSupplierRequest,
  ModSupplierRequestBody,
  SupplierDetailResponse,
  ManagerInfo,
  Material,
} from '@/app/(private)/purchase/types/SupplierType';
import Button from '@/app/components/common/Button';
import IconButton from '@/app/components/common/IconButton';
import Dropdown from '@/app/components/common/Dropdown';
import { SupplierCategory } from '@/app/(private)/purchase/constants';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSupplyRequest,
  patchSupplyRequest,
  fetchSupplierCategoryDropdown,
  fetchSupplierStatusDropdown,
} from '@/app/(private)/purchase/api/purchase.api';
import { ModalProps } from '@/app/components/common/modal/types';
import { useDropdown } from '@/app/hooks/useDropdown';
import LoadingMessage from '@/app/components/common/LoadingMessage';
import Input, { InputLabel } from '@/app/components/common/Input';
import { useToast } from '@/app/components/common/toast/useToast';

interface SupplierFormModalProps extends ModalProps {
  initialData?: SupplierDetailResponse; // 수정 모드일 때 전달
}

export default function SupplierFormModal({ initialData, onClose }: SupplierFormModalProps) {
  const isEditMode = !!initialData; // initialData가 있으면 수정 모드
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialData?.supplierInfo.category || '',
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    initialData?.supplierInfo.supplierStatusCode || '',
  );

  // 공급업체 카테고리 드롭다운
  const { options: supplierCategoryOptions } = useDropdown(
    'supplierCategoryDropdown',
    fetchSupplierCategoryDropdown,
    'without-all',
  );
  // 공급업체 상태 드롭다운
  const { options: supplierStatusOptions } = useDropdown(
    'supplierStatusDropdown',
    fetchSupplierStatusDropdown,
    'without-all',
  );

  const [supplierInfo, setSupplierInfo] = useState({
    supplierName: initialData?.supplierInfo.supplierName || '',
    supplierEmail: initialData?.supplierInfo.supplierEmail || '',
    supplierPhone: initialData?.supplierInfo.supplierPhone || '',
    supplierBaseAddress: initialData?.supplierInfo.supplierBaseAddress || '',
    supplierDetailAddress: initialData?.supplierInfo.supplierDetailAddress || '',
    category: initialData?.supplierInfo.category || ('ALL' as SupplierCategory),
    statusCode: initialData?.supplierInfo.supplierStatusCode || '',
    deliveryLeadTime: initialData?.supplierInfo.deliveryLeadTime || 0,
  });

  const [managerInfo, setManagerInfo] = useState<ManagerInfo>({
    managerName: initialData?.managerInfo.managerName || '',
    managerPhone: initialData?.managerInfo.managerPhone || '',
    managerEmail: initialData?.managerInfo.managerEmail || '',
  });

  const [materialList, setMaterialList] = useState<Material[]>([
    {
      materialName: '',
      uomCode: '',
      unitPrice: 0,
    },
  ]);

  // 카테고리 변경 시 supplierInfo 업데이트
  useEffect(() => {
    if (selectedCategory) {
      setSupplierInfo((prev) => ({
        ...prev,
        category: selectedCategory as SupplierCategory,
      }));
    }
  }, [selectedCategory]);

  // 생성 mutation
  const { mutate: submitSupplierCreate, isPending: isCreating } = useMutation({
    mutationFn: createSupplyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierList'] });
      toast.success('공급업체 등록이 완료되었습니다.');
      onClose();
    },
  });

  // 수정 mutation
  // 수정 mutation 부분만 수정
  const { mutate: submitSupplierUpdate, isPending: isUpdating } = useMutation({
    mutationFn: (body: ModSupplierRequestBody) => {
      const supplierId = initialData?.supplierInfo.supplierId;
      if (!supplierId) {
        throw new Error('공급업체 ID를 찾을 수 없습니다.');
      }
      return patchSupplyRequest(supplierId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierList'] });
      if (initialData?.supplierInfo.supplierId) {
        queryClient.invalidateQueries({
          queryKey: ['supplierDetail', initialData.supplierInfo.supplierId],
        });
      }
      toast.success('공급업체 정보가 수정되었습니다.');
      onClose();
    },
  });

  const isLoading = isCreating || isUpdating;

  const handleAddMaterialRow = (): void => {
    setMaterialList([
      ...materialList,
      {
        materialName: '',
        uomCode: '',
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveMaterialRow = (index: number): void => {
    if (materialList.length > 1) {
      setMaterialList(materialList.filter((_, i) => i !== index));
    }
  };

  const handleMaterialChange = (index: number, field: keyof Material, value: string): void => {
    const updated = [...materialList];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setMaterialList(updated);
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (isEditMode) {
      // 수정 모드
      if (
        !supplierInfo.supplierName ||
        !supplierInfo.supplierEmail ||
        !supplierInfo.supplierPhone ||
        !supplierInfo.supplierBaseAddress ||
        !supplierInfo.category ||
        !managerInfo.managerName ||
        !managerInfo.managerPhone ||
        !managerInfo.managerEmail
      ) {
        toast.warning('모든 필수 항목을 입력해주세요.');
        return;
      }

      const updateRequest: ModSupplierRequestBody = {
        supplierName: supplierInfo.supplierName,
        supplierEmail: supplierInfo.supplierEmail,
        supplierPhone: supplierInfo.supplierPhone,
        supplierBaseAddress: supplierInfo.supplierBaseAddress,
        supplierDetailAddress: supplierInfo.supplierDetailAddress || '',
        category: supplierInfo.category,
        statusCode: supplierInfo.statusCode,
        deliverLeadTime: supplierInfo.deliveryLeadTime,
        managerName: managerInfo.managerName,
        managerPhone: managerInfo.managerPhone,
        managerEmail: managerInfo.managerEmail,
      };

      submitSupplierUpdate(updateRequest);
    } else {
      // 생성 모드
      if (
        !supplierInfo.supplierName ||
        !supplierInfo.supplierEmail ||
        !supplierInfo.supplierPhone ||
        !supplierInfo.supplierBaseAddress ||
        !supplierInfo.category ||
        !managerInfo.managerName ||
        !managerInfo.managerPhone ||
        !managerInfo.managerEmail
      ) {
        toast.warning('모든 필수 항목을 입력해주세요.');
        return;
      }

      // 입력된 자재만 필터링
      const filteredMaterials = materialList.filter(
        (m) => m.materialName && m.uomCode && m.unitPrice,
      );

      // 자재 검증
      if (filteredMaterials.length === 0) {
        toast.info('최소 하나의 유효한 자재 정보를 입력해야 합니다.');
        return;
      }

      // CreateSupplierRequest 형태로 데이터 구성
      const supplierRequest: CreateSupplierRequest = {
        supplierInfo: {
          supplierName: supplierInfo.supplierName,
          supplierEmail: supplierInfo.supplierEmail,
          supplierPhone: supplierInfo.supplierPhone,
          supplierBaseAddress: supplierInfo.supplierBaseAddress,
          supplierDetailAddress: supplierInfo.supplierDetailAddress || null,
          category: supplierInfo.category,
          deliveryLeadTime: supplierInfo.deliveryLeadTime,
        },
        managerInfo,
        materialList: filteredMaterials.map((m) => ({
          materialName: m.materialName,
          uomCode: m.uomCode,
          unitPrice: Number(m.unitPrice),
        })),
      };

      submitSupplierCreate(supplierRequest);
    }
  };

  const getDeliveryLabel = (days: number): string => {
    if (days === 0) return '당일 배송';
    return `${days}일 배송`;
  };

  const filledMaterialCount = materialList.filter(
    (m) => m.materialName && m.uomCode && m.unitPrice,
  ).length;

  if (isLoading) {
    return isEditMode ? (
      <LoadingMessage message="공급업체 정보를 수정하는 중..." />
    ) : (
      <LoadingMessage message="공급업체를 등록하는 중..." />
    );
  }

  return (
    <>
      {/* 폼 */}
      <form onSubmit={handleSubmit} className="flex px-2 flex-col gap-6">
        {/* 공급업체 정보 섹션 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">공급업체 정보</h4>

          {/* 기본 정보 (2열 그리드) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-2">
            {/* 1. 업체명 */}
            <div>
              <Input
                label="업체명"
                inputSize="md" // 크기 통일
                type="text"
                value={supplierInfo.supplierName}
                onChange={(e) => setSupplierInfo({ ...supplierInfo, supplierName: e.target.value })}
                required
              />
            </div>

            <div />
            <div />

            {/* 2. 업체 이메일 */}
            <div>
              <Input
                label="업체 이메일"
                inputSize="md" // 크기 통일
                type="email"
                value={supplierInfo.supplierEmail}
                onChange={(e) =>
                  setSupplierInfo({ ...supplierInfo, supplierEmail: e.target.value })
                }
                placeholder="예: company@example.com"
                required
              />
            </div>

            {/* 3. 업체 전화번호 */}
            <div>
              <Input
                label="업체 전화번호"
                inputSize="md" // 크기 통일
                type="tel"
                value={supplierInfo.supplierPhone}
                onChange={(e) =>
                  setSupplierInfo({ ...supplierInfo, supplierPhone: e.target.value })
                }
                placeholder="예: 02-1234-5678"
                required={isEditMode}
              />
            </div>

            {/* 4. 배송 리드타임(일) - 2열 그리드 내부에 배치 */}
            <div>
              <InputLabel label="배송 리드타임(일)" required={true} />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  maxLength={2}
                  inputSize="md"
                  min="0"
                  value={supplierInfo.deliveryLeadTime}
                  onChange={(e) =>
                    setSupplierInfo({
                      ...supplierInfo,
                      deliveryLeadTime: parseInt(e.target.value) || 0,
                    })
                  }
                  className="flex-1"
                  required
                />
              </div>
              <div className="pl-1 mt-1 text-xs text-gray-600 whitespace-nowrap font-medium">
                ({getDeliveryLabel(supplierInfo.deliveryLeadTime)})
              </div>
            </div>

            {/* 5. 카테고리 & 상태 (하나의 행에 묶음) */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {/* 카테고리 */}
              <div>
                <InputLabel label="카테고리" required={true} />
                <Dropdown
                  placeholder="카테고리 선택"
                  items={supplierCategoryOptions}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                />
              </div>

              {/* 상태 */}
              <div>
                <InputLabel label="상태" />
                <Dropdown
                  placeholder="상태 선택"
                  items={supplierStatusOptions}
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                />
              </div>
            </div>
          </div>

          {/* 주소 (2열 그리드) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 6. 기본 주소 */}
            <div>
              <Input
                label="기본 주소"
                inputSize="md" // 크기 통일
                type="text"
                value={supplierInfo.supplierBaseAddress}
                onChange={(e) =>
                  setSupplierInfo({ ...supplierInfo, supplierBaseAddress: e.target.value })
                }
                placeholder="예: 서울시 강남구 테헤란로 123"
                required
              />
            </div>

            {/* 7. 상세 주소 */}
            <div>
              <Input
                label="상세 주소"
                inputSize="md" // 크기 통일
                type="text"
                value={supplierInfo.supplierDetailAddress}
                onChange={(e) =>
                  setSupplierInfo({ ...supplierInfo, supplierDetailAddress: e.target.value })
                }
                placeholder="예: 2층 201호"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* 담당자 정보 섹션 */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">담당자 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. 담당자명 */}
            <div>
              <Input
                label="담당자명"
                inputSize="md" // 크기 통일
                type="text"
                value={managerInfo.managerName}
                onChange={(e) => setManagerInfo({ ...managerInfo, managerName: e.target.value })}
                required
              />
            </div>

            {/* 2. 담당자 전화번호 */}
            <div>
              <Input
                label="담당자 전화번호"
                inputSize="md" // 크기 통일
                type="text"
                value={managerInfo.managerPhone}
                onChange={(e) => setManagerInfo({ ...managerInfo, managerPhone: e.target.value })}
                placeholder="예: 010-1234-5678"
                required
              />
            </div>

            {/* 3. 담당자 이메일 */}
            <div>
              <Input
                label="담당자 이메일"
                inputSize="md" // 크기 통일
                type="email"
                value={managerInfo.managerEmail}
                onChange={(e) => setManagerInfo({ ...managerInfo, managerEmail: e.target.value })}
                placeholder="예: manager@example.com"
                required
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* 제공 가능한 자재 섹션 - 생성 모드에만 표시 */}
        {!isEditMode && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">
                제공 가능한 자재 목록 ({filledMaterialCount}건 입력)
              </h4>
              <IconButton
                type="button"
                label="자재 추가"
                variant="secondary"
                size="sm"
                icon="ri-add-line"
                onClick={handleAddMaterialRow}
              />
            </div>

            {/* 자재 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                      자재명
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                      단위
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                      단가
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materialList.map((material, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={material.materialName}
                          onChange={(e) =>
                            handleMaterialChange(index, 'materialName', e.target.value)
                          }
                          placeholder="예: 철강봉"
                          inputSize="sm" // 테이블 내부 입력은 sm 유지
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={material.uomCode}
                          onChange={(e) => handleMaterialChange(index, 'uomCode', e.target.value)}
                          placeholder="예: φ10×1000mm"
                          inputSize="sm" // 테이블 내부 입력은 sm 유지
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={material.unitPrice}
                          onChange={(e) => handleMaterialChange(index, 'unitPrice', e.target.value)}
                          placeholder="예: ₩10,000 / EA"
                          inputSize="sm" // 테이블 내부 입력은 sm 유지
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialRow(index)}
                          disabled={materialList.length === 1}
                          className={`p-1 rounded cursor-pointer ${
                            materialList.length === 1
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <hr className="border-gray-200" />

        {/* 버튼 */}
        <div className="flex items-center justify-end pt-2">
          <Button label={isEditMode ? '수정' : '공급업체 등록'} type="submit" />
        </div>
      </form>
    </>
  );
}
