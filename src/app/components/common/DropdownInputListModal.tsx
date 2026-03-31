'use client';

import { useState, useEffect } from 'react';
import IconButton from '@/app/components/common/IconButton';
import Button from '@/app/components/common/Button';
import InputList from '@/app/components/common/InputList';
import { KeyValueItem } from '@/app/types/CommonType';
import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from '@floating-ui/react';

interface DropdownInputListModalProps<T extends string> {
  initialItems?: KeyValueItem<T>[];
  onSubmit: (items: KeyValueItem<T>[]) => void;
}

export default function DropdownInputListModal<T extends string>({
  initialItems = [],
  onSubmit,
}: DropdownInputListModalProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<KeyValueItem<T>[]>(initialItems);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(6), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // 외부 클릭 시 모달 닫기 + 값 제출
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isOpen && !refs.floating.current?.contains(target)) {
        onSubmit(items);
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, refs, items, onSubmit]);

  // 모달 열기
  const openModal = () => setIsOpen(true);

  // 확인 버튼 클릭 시
  const handleSubmit = () => {
    onSubmit(items);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      {/* 모달 열기 버튼 */}
      <div ref={refs.setReference}>
        <IconButton
          type="button"
          icon="ri-pencil-line"
          variant={items.length > 0 ? 'primary' : 'secondary'}
          size="sm"
          onClick={openModal}
        />
      </div>

      {/* 모달 영역 */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-popover bg-white border border-gray-200 rounded-xl shadow-3xl p-4 py-6 w-72 animate-fadeIn"
          >
            <div className="w-full overflow-y-auto">
              <InputList initialItems={items} onChange={(newItems) => setItems(newItems)} />
            </div>

            <div className="flex justify-end mt-3">
              <Button label="확인" size="sm" onClick={handleSubmit} />
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
