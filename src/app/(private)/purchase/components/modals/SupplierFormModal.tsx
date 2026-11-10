'use client';

import { useState } from 'react';
import {
  type CreateSupplierBody,
  type UpdateSupplierBody,
  type SupplierDetail,
  type ManagerInfo,
  type Material,
} from '@/app/(private)/purchase/types/SupplierType';
import { Button } from '@everp/ui';
import { Dropdown } from '@everp/ui';
import {
  fetchSupplierCategoryOptions,
  fetchSupplierStatusOptions,
} from '@/app/(private)/purchase/api/purchase.api';
import {
  useCreateSupplier,
  useUpdateSupplier,
} from '@/app/(private)/purchase/api/purchase.mutations';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useDropdown } from '@/app/hooks/useDropdown';
import { LoadingMessage } from '@everp/ui';
import { Input, InputLabel } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useTranslations } from 'next-intl';

interface SupplierFormModalProps extends ModalProps {
  initialData?: SupplierDetail; // 수정 모드일 때 전달
}

export default function SupplierFormModal({ initialData, onClose }: SupplierFormModalProps) {
  const isEditMode = !!initialData; // initialData가 있으면 수정 모드
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const t = useTranslations('purchase.supplierForm');
  const tc = useTranslations('purchase.common');

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialData?.supplierInfo.category || '',
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    initialData?.supplierInfo.supplierStatusCode || '',
  );

  // 공급업체 카테고리 드롭다운
  const { options: supplierCategoryOptions } = useDropdown(
    'supplierCategoryDropdown',
    fetchSupplierCategoryOptions,
    'without-all',
  );
  // 공급업체 상태 드롭다운
  const { options: supplierStatusOptions } = useDropdown(
    'supplierStatusDropdown',
    fetchSupplierStatusOptions,
    'without-all',
  );

  const [supplierInfo, setSupplierInfo] = useState({
    supplierName: initialData?.supplierInfo.supplierName || '',
    supplierEmail: initialData?.supplierInfo.supplierEmail || '',
    supplierPhone: initialData?.supplierInfo.supplierPhone || '',
    supplierBaseAddress: initialData?.supplierInfo.supplierBaseAddress || '',
    supplierDetailAddress: initialData?.supplierInfo.supplierDetailAddress || '',
    category: initialData?.supplierInfo.category || '',
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

  // mutation 과 무효화 범위는 purchase.mutations.ts 한 곳. 여기선 알리고 닫는다.
  const { mutate: submitSupplierCreate, isPending: isCreating } = useCreateSupplier({
    onSuccess: () => {
      toast.success(t('createSuccess'));
      onClose();
    },
    onError: (error) => toast.error(t('createError', { message: errorMessageOf(error) })),
  });
  const { mutate: submitSupplierUpdate, isPending: isUpdating } = useUpdateSupplier({
    onSuccess: () => {
      toast.success(t('updateSuccess'));
      onClose();
    },
    onError: (error) => toast.error(t('updateError', { message: errorMessageOf(error) })),
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
        toast.warning(tc('required'));
        return;
      }

      const updateRequest: UpdateSupplierBody = {
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

      const supplierId = initialData.supplierInfo.supplierId;
      if (!supplierId) {
        toast.error(t('missingId'));
        return;
      }
      submitSupplierUpdate({ supplierId, body: updateRequest });
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
        toast.warning(tc('required'));
        return;
      }

      // 입력된 자재만 필터링
      const filteredMaterials = materialList.filter(
        (m) => m.materialName && m.uomCode && m.unitPrice,
      );

      // 자재 검증
      if (filteredMaterials.length === 0) {
        toast.info(t('materialRequired'));
        return;
      }

      const supplierRequest: CreateSupplierBody = {
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
    if (days === 0) return t('sameDay');
    return t('deliveryDays', { days });
  };

  const filledMaterialCount = materialList.filter(
    (m) => m.materialName && m.uomCode && m.unitPrice,
  ).length;

  if (isLoading) {
    return isEditMode ? (
      <LoadingMessage message={t('updating')} />
    ) : (
      <LoadingMessage message={t('creating')} />
    );
  }

  return (
    <>
      {/* 폼 */}
      <form onSubmit={handleSubmit} className="flex px-2 flex-col gap-6">
        {/* 공급업체 정보 섹션 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('infoTitle')}</h4>

          {/* 기본 정보 (2열 그리드) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-2">
            {/* 1. 업체명 */}
            <div>
              <Input
                label={t('name')}
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
                label={t('email')}
                inputSize="md" // 크기 통일
                type="email"
                value={supplierInfo.supplierEmail}
                onChange={(e) =>
                  setSupplierInfo({ ...supplierInfo, supplierEmail: e.target.value })
                }
                placeholder={t('emailPlaceholder')}
                required
              />
            </div>

            {/* 3. 업체 전화번호 */}
            <div>
              <Input
                label={t('phone')}
                inputSize="md" // 크기 통일
                type="tel"
                value={supplierInfo.supplierPhone}
                onChange={(e) =>
                  setSupplierInfo({ ...supplierInfo, supplierPhone: e.target.value })
                }
                placeholder={t('phonePlaceholder')}
                required={isEditMode}
              />
            </div>

            {/* 4. 배송 리드타임(일) - 2열 그리드 내부에 배치 */}
            <div>
              <InputLabel label={t('leadTime')} required={true} />
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
                <InputLabel label={t('category')} required={true} />
                <Dropdown
                  placeholder={t('categoryPlaceholder')}
                  items={supplierCategoryOptions}
                  value={selectedCategory}
                  onChange={(category: string) => {
                    // 선택값과 제출용 값을 한 번에 바꾼다(예전엔 effect 로 옮겼다)
                    setSelectedCategory(category);
                    setSupplierInfo((prev) => ({ ...prev, category }));
                  }}
                />
              </div>

              {/* 상태 */}
              <div>
                <InputLabel label={t('status')} />
                <Dropdown
                  placeholder={t('statusPlaceholder')}
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
                label={t('baseAddress')}
                inputSize="md" // 크기 통일
                type="text"
                value={supplierInfo.supplierBaseAddress}
                onChange={(e) =>
                  setSupplierInfo({ ...supplierInfo, supplierBaseAddress: e.target.value })
                }
                placeholder={t('baseAddressPlaceholder')}
                required
              />
            </div>

            {/* 7. 상세 주소 */}
            <div>
              <Input
                label={t('detailAddress')}
                inputSize="md" // 크기 통일
                type="text"
                value={supplierInfo.supplierDetailAddress}
                onChange={(e) =>
                  setSupplierInfo({ ...supplierInfo, supplierDetailAddress: e.target.value })
                }
                placeholder={t('detailAddressPlaceholder')}
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* 담당자 정보 섹션 */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">{t('managerTitle')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. 담당자명 */}
            <div>
              <Input
                label={t('managerName')}
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
                label={t('managerPhone')}
                inputSize="md" // 크기 통일
                type="text"
                value={managerInfo.managerPhone}
                onChange={(e) => setManagerInfo({ ...managerInfo, managerPhone: e.target.value })}
                placeholder={t('managerPhonePlaceholder')}
                required
              />
            </div>

            {/* 3. 담당자 이메일 */}
            <div>
              <Input
                label={t('managerEmail')}
                inputSize="md" // 크기 통일
                type="email"
                value={managerInfo.managerEmail}
                onChange={(e) => setManagerInfo({ ...managerInfo, managerEmail: e.target.value })}
                placeholder={t('managerEmailPlaceholder')}
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
                {t('materialsTitle', { count: filledMaterialCount })}
              </h4>
              <Button
                type="button"
                label={t('addMaterial')}
                variant="secondary"
                size="sm"
                onClick={handleAddMaterialRow}
              />
            </div>

            {/* 자재 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                      {t('materialColumns.name')}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                      {t('materialColumns.unit')}
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                      {t('materialColumns.unitPrice')}
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
                          placeholder={t('materialPlaceholders.name')}
                          inputSize="sm" // 테이블 내부 입력은 sm 유지
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={material.uomCode}
                          onChange={(e) => handleMaterialChange(index, 'uomCode', e.target.value)}
                          placeholder={t('materialPlaceholders.unit')}
                          inputSize="sm" // 테이블 내부 입력은 sm 유지
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={material.unitPrice}
                          onChange={(e) => handleMaterialChange(index, 'unitPrice', e.target.value)}
                          placeholder={t('materialPlaceholders.unitPrice')}
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
          <Button label={isEditMode ? tc('edit') : t('submitCreate')} type="submit" />
        </div>
      </form>
    </>
  );
}
