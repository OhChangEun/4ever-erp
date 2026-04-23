import { SupplierResponse, SupplierInfo } from '@/app/(private)/purchase/types/SupplierType';
import { useState } from 'react';
import { useToast } from '@/app/components/common/toast/useToast';

interface EditSupplierProps {
  supplier: SupplierResponse;
  setEditForm: (form: SupplierResponse) => void;
  onCancel: () => void;
  onSave: () => void;
}

const categories = ['철강/금속', '화학/소재', '전자부품', '기계부품', '포장재', '소모품'];
const statuses = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
];

export default function EditSupplierFormSection({
  supplier,
  setEditForm,
  onCancel,
  onSave,
}: EditSupplierProps) {
  const [form, setForm] = useState<SupplierResponse>(supplier);
  const toast = useToast();

  const handleSupplierInfoChange = (field: keyof SupplierInfo, value: string | number) => {
    const updated = {
      ...form,
      supplierInfo: {
        ...form.supplierInfo,
        [field]: value,
      },
    };
    setForm(updated);
    setEditForm(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const { supplierInfo } = form;

    if (
      !supplierInfo.supplierName ||
      !supplierInfo.category ||
      !supplierInfo.supplierEmail ||
      !supplierInfo.supplierPhone ||
      !supplierInfo.supplierBaseAddress ||
      !supplierInfo.deliveryLeadTime
    ) {
      toast.warning('필수 항목을 입력해주세요');
      return;
    }
    onSave();
    toast.success('공급업체 정보가 수정되었습니다.');
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* 기본 정보 */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">업체 ID</label>
            <input
              type="text"
              value={form.supplierInfo.supplierId}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              업체명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.supplierInfo.supplierName}
              onChange={(e) => handleSupplierInfoChange('supplierName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.supplierInfo.category}
              onChange={(e) => handleSupplierInfoChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              required
            >
              <option value="">카테고리 선택</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.supplierInfo.supplierStatusCode}
              onChange={(e) => handleSupplierInfoChange('supplierStatusCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              required
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 연락처 정보 */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">연락처 정보</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.supplierInfo.supplierPhone}
              onChange={(e) => handleSupplierInfoChange('supplierPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.supplierInfo.supplierEmail}
              onChange={(e) => handleSupplierInfoChange('supplierEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>

      {/* 배송 정보 */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">배송 정보</h4>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              기본 주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.supplierInfo.supplierBaseAddress}
              onChange={(e) => handleSupplierInfoChange('supplierBaseAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">상세 주소</label>
            <input
              type="text"
              value={form.supplierInfo.supplierDetailAddress || ''}
              onChange={(e) => handleSupplierInfoChange('supplierDetailAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              배송 리드타임(일) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.supplierInfo.deliveryLeadTime}
              onChange={(e) => handleSupplierInfoChange('deliveryLeadTime', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min="0"
            />
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer whitespace-nowrap"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer whitespace-nowrap"
        >
          저장
        </button>
      </div>
    </form>
  );
}
