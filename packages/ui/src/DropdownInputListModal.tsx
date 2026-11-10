'use client';

import { useState, useEffect } from 'react';
import IconButton from './IconButton';
import Button from './Button';
import InputList from './InputList';
import { type KeyValueItem } from './types';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import PopoverPortal from './PopoverPortal';
import { useUiText } from './UiText';
import { useCloseOnEscape } from './hooks/useCloseOnEscape';

interface DropdownInputListModalProps {
  initialItems?: KeyValueItem<number>[];
  onSubmit: (items: KeyValueItem<number>[]) => void;
}

export default function DropdownInputListModal({
  initialItems = [],
  onSubmit,
}: DropdownInputListModalProps) {
  const text = useUiText();
  const [isOpen, setIsOpen] = useState(false);
  useCloseOnEscape(isOpen, setIsOpen);
  const [items, setItems] = useState<KeyValueItem<number>[]>(initialItems);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(6), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });
  // floating-ui 의 콜백 ref. refs.setX 를 JSX 에서 읽으면 React 규칙이 렌더 중 ref 접근으로 본다
  const { setReference, setFloating } = refs;

  // 외부 클릭 시 모달 닫기 + 값 제출
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target instanceof Node ? e.target : null;
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
      <div ref={setReference}>
        <IconButton
          type="button"
          icon="ri-pencil-line"
          aria-label={text.dropdownInputListModal.open}
          variant={items.length > 0 ? 'primary' : 'secondary'}
          size="sm"
          onClick={openModal}
        />
      </div>

      {/* 모달 영역 */}
      {isOpen && (
        <PopoverPortal>
          <div
            ref={setFloating}
            style={floatingStyles}
            className="z-popover bg-white border border-gray-200 rounded-xl shadow-3xl p-4 py-6 w-72 animate-fadeIn"
          >
            <div className="w-full overflow-y-auto">
              <InputList initialItems={items} onChange={(newItems) => setItems(newItems)} />
            </div>

            <div className="flex justify-end mt-3">
              <Button label={text.confirm} size="sm" onClick={handleSubmit} />
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}
