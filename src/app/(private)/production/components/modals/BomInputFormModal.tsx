'use client';

import { Button } from '@everp/ui';
import { Dropdown } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDropdown } from '@/app/hooks/useDropdown';
import {
  fetchOperationDropdown,
  fetchProductDropdown,
  fetchProduction,
} from '../../api/production.api';
import { useCreateBom } from '../../api/production.mutations';
import { useQuery } from '@tanstack/react-query';
import { type BomRequestBody } from '../../types/BomType';
import type productionKo from '@/i18n/messages/production/ko.json';
import { Input } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { bomKeys } from '@/app/(private)/production/api/production.keys';
import { useTranslations } from 'next-intl';
import { formatNumber } from '@/app/utils/number';

interface BomInputFormModalProps extends ModalProps {
  editMode?: boolean;
}

interface MaterialInfo {
  id: string;
  name: string;
  productCode: string;
  type: string;
  supplier: string;
  unit: string;
  unitPrice: number;
}

interface OperationInfo {
  id: string;
  name: string;
}

// "productName": "string",
//   "unit": "string",
//   "items": [
//     {
//       "itemId": "string",
//       "quantity": 0,
//       "operationId": "string",
//       "sequence": 0
//     }
//   ]

interface BomItem {
  id: string;
  itemId: string;
  materialInfo?: MaterialInfo;
  quantity: number;
  operationId: string;
  sequence: number;
}

// 목업 데이터
const MOCK_MATERIALS: MaterialInfo[] = [
  {
    id: 'M001',
    name: '디스플레이 패널',
    productCode: 'DP-2024-001',
    type: '전자부품',
    supplier: '삼성디스플레이',
    unit: '개',
    unitPrice: 150000,
  },
  {
    id: 'M002',
    name: 'AP 칩셋',
    productCode: 'AP-2024-002',
    type: '반도체',
    supplier: '퀄컴',
    unit: '개',
    unitPrice: 80000,
  },
  {
    id: 'M003',
    name: '배터리',
    productCode: 'BT-2024-003',
    type: '전지',
    supplier: 'LG에너지솔루션',
    unit: '개',
    unitPrice: 45000,
  },
  {
    id: 'M004',
    name: '카메라 모듈',
    productCode: 'CM-2024-004',
    type: '광학부품',
    supplier: '소니',
    unit: '개',
    unitPrice: 35000,
  },
  {
    id: 'M005',
    name: '케이스',
    productCode: 'CS-2024-005',
    type: '외장재',
    supplier: '폭스콘',
    unit: '개',
    unitPrice: 12000,
  },
];

const MOCK_OPERATIONS: OperationInfo[] = [
  { id: 'OP001', name: '조립' },
  { id: 'OP002', name: '검사' },
  { id: 'OP003', name: '테스트' },
  { id: 'OP004', name: '포장' },
];

interface SortableRowProps {
  item: BomItem;
  materialOptions: { key: string; value: string }[];
  operationOptions: { key: string; value: string }[];
  onMaterialChange: (id: string, materialId: string) => void;
  onItemChange: (id: string, field: keyof BomItem, value: string | number) => void;
  onRemove: (id: string) => void;
}

function SortableRow({ item, onMaterialChange, onItemChange, onRemove }: SortableRowProps) {
  const t = useTranslations('production');
  const { options: productsOptions } = useDropdown('productsDropdown', fetchProductDropdown);
  const { options: operationOptions } = useDropdown('operationsDropdown', fetchOperationDropdown);

  // 자재를 고르면 itemId 가 바뀌어 이 쿼리가 다시 가져온다(따로 부르던 mutation 은 중복이라 지움)
  const { data: materialInfo, isError: isMaterialError } = useQuery({
    queryKey: bomKeys.materialInfo(item.itemId),
    queryFn: () => fetchProduction(item.itemId),
    enabled: !!item.itemId, // 선택된 자재가 있을 때만 호출
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'bg-blue-50' : ''}>
      <td {...attributes} {...listeners} className="px-3 py-2 cursor-move">
        <i className="ri-draggable text-gray-400"></i>
      </td>
      <td className="px-3 py-2">
        <Input type="number" value={item.sequence} disabled />
      </td>
      <td className="px-3 py-2 w-40">
        <Dropdown
          items={productsOptions}
          value={item.itemId}
          onChange={(selectedMaterialId) => {
            onMaterialChange(item.id, selectedMaterialId);
          }}
          placeholder={t('bomForm.selectMaterial')}
        />
      </td>
      <td className="px-3 py-2">
        {isMaterialError ? (
          <span role="alert" className="text-xs text-red-600">
            {t('bomForm.materialLoadFailed')}
          </span>
        ) : (
          <Input type="text" value={materialInfo?.productNumber || ''} disabled />
        )}
      </td>
      <td className="px-3 py-2">
        <StatusLabel statusCode={materialInfo?.category ?? ''} />
        {/* <Input type="text" value={materialInfo?.category || ''} disabled /> */}
      </td>
      <td className="px-3 py-2">
        <Input
          type="text"
          value={materialInfo?.category === 'ITEM' ? '4Ever' : materialInfo?.supplierName || ''}
          disabled
        />
      </td>
      <td className="px-3 py-2">
        <Input type="text" value={materialInfo?.uomName || ''} disabled />
      </td>
      <td className="px-3 py-2">
        <Input
          type="text"
          value={
            materialInfo?.unitPrice
              ? t('bomForm.won', { value: formatNumber(materialInfo.unitPrice) })
              : ''
          }
          disabled
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          value={item.quantity}
          onChange={(e) => onItemChange(item.id, 'quantity', Number(e.target.value))}
          min="1"
        />
      </td>
      <td className="px-3 py-2 w-32">
        <Dropdown
          items={operationOptions}
          value={item.operationId}
          onChange={(value) => onItemChange(item.id, 'operationId', value)}
          placeholder={t('bomForm.selectOperation')}
        />
      </td>
      <td className="px-3 py-2">
        <Button
          label={t('common.delete')}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="text-red-600 hover:bg-red-50"
        />
      </td>
    </tr>
  );
}

// 구성품 표 머리. 메시지 키(production.bomForm.columns.<키>)
const COLUMNS = [
  'sequence',
  'material',
  'productCode',
  'type',
  'supplier',
  'unit',
  'unitPrice',
  'quantity',
  'operation',
  'delete',
] satisfies (keyof typeof productionKo.bomForm.columns)[];

export default function BomInputFormModal({ editMode = false, onClose }: BomInputFormModalProps) {
  const t = useTranslations('production');
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const [productName, setProductName] = useState('');
  const [unit, setUnit] = useState('');
  const [bomItems, setBomItems] = useState<BomItem[]>([]);

  const { mutate: updateBomItem, isPending } = useCreateBom({
    onSuccess: () => {
      toast.success(t('bomForm.createSuccess'));
      onClose();
    },
    onError: (error) => toast.error(t('bomForm.createError', { message: errorMessageOf(error) })),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const materialOptions = MOCK_MATERIALS.map((m) => ({
    key: m.id,
    value: m.name,
  }));

  const operationOptions = MOCK_OPERATIONS.map((o) => ({
    key: o.id,
    value: o.name,
  }));

  const handleAddRow = () => {
    const newItem: BomItem = {
      id: Date.now().toString(),
      itemId: '',
      quantity: 1,
      operationId: '',
      sequence: bomItems.length + 1,
    };
    setBomItems([...bomItems, newItem]);
  };

  const handleRemoveRow = (id: string) => {
    const updatedItems = bomItems.filter((item) => item.id !== id);
    const reorderedItems = updatedItems.map((item, index) => ({
      ...item,
      sequence: index + 1,
    }));
    setBomItems(reorderedItems);
  };

  const handleMaterialChange = (id: string, materialId: string) => {
    const material = MOCK_MATERIALS.find((m) => m.id === materialId);
    setBomItems(
      bomItems.map((item) =>
        item.id === id ? { ...item, itemId: materialId, materialInfo: material } : item,
      ),
    );
  };

  const handleItemChange = (id: string, field: keyof BomItem, value: string | number) => {
    setBomItems(bomItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBomItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({
          ...item,
          sequence: index + 1,
        }));
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const bomData: BomRequestBody = {
      productName,
      unit,
      items: bomItems.map(({ id, materialInfo, ...rest }) => rest), // 필요한 dto만
    };

    updateBomItem(bomData);
    console.log('BOM 데이터:', bomData);
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-3">
          <div className="flex-1">
            <Input
              label={t('common.productName')}
              type="text"
              placeholder={t('bomForm.productPlaceholder')}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>

          <div className="flex-1">
            <Input
              label={t('common.unit')}
              type="text"
              placeholder="EA"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold text-gray-900">{t('bomForm.componentsTitle')}</h4>
            <Button
              label={t('bomForm.addRow')}
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddRow}
            />
          </div>

          <div className="overflow-x-auto h-[440px] rounded-lg overflow-scroll border border-gray-200">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-8">
                      <i className="ri-draggable"></i>
                    </th>
                    {COLUMNS.map((column) => (
                      <th
                        key={column}
                        className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                      >
                        {t(`bomForm.columns.${column}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <SortableContext
                  items={bomItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bomItems.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        materialOptions={materialOptions}
                        operationOptions={operationOptions}
                        onMaterialChange={handleMaterialChange}
                        onItemChange={handleItemChange}
                        onRemove={handleRemoveRow}
                      />
                    ))}
                    {bomItems.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-3 py-8 text-center text-gray-500 text-sm">
                          {t('bomForm.empty')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            label={editMode ? t('bomForm.edit') : t('bomForm.create')}
            type="submit"
            disabled={isPending}
          />
        </div>
      </form>
    </div>
  );
}
