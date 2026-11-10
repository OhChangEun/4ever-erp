import type { KeyValueItem } from './types';
import {
  autoUpdate,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
  useTypeahead,
} from '@floating-ui/react';
import PopoverPortal from './PopoverPortal';
import { useUiText } from './UiText';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

// size prop 추가
interface DropdownProps<T extends string = string> {
  placeholder: string;
  items: KeyValueItem<T>[]; // options. 키 타입이 onChange 까지 이어진다
  value: T; // 선택된 값
  onChange?: (key: T) => void;
  className?: string;
  autoSelectFirst?: boolean;
  size?: 'sm' | 'md'; // 'sm' 또는 'md' 사이즈 추가
  disabled?: boolean;
}

/**
 * 값 하나를 고르는 드롭다운. WAI-ARIA APG 의 select-only combobox(접근성 3 카드).
 * 버튼이 combobox, 목록이 listbox, 항목이 option. 포커스는 버튼에 남고 가리킨 항목은 aria-activedescendant.
 * 키보드: 화살표(열기, 이동), Home/End, 글자(그 글자로 시작하는 항목), Enter/Space(고르기), Esc(닫기).
 * 키보드와 aria 는 floating-ui interaction 훅이 맡는다. Radix Select 보다 첫 로드가 24KB 작다(카드 결정 1).
 */
export default function Dropdown<T extends string = string>({
  items,
  value,
  onChange,
  className = '',
  placeholder,
  autoSelectFirst = false,
  size = 'md', // 기본값을 'md'로 설정
  disabled = false,
}: DropdownProps<T>) {
  const emptyText = useUiText().dropdown.empty;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isOpen = open && !disabled;
  // 항목 요소와 글자(타이프어헤드용). floating-ui 가 인덱스로 읽는다
  const listRef = useRef<(HTMLElement | null)[]>([]);
  const labelsRef = useRef<(string | null)[]>([]);
  // 글자를 치는 중엔 Space 를 고르기가 아니라 글자로 본다("기타 자재" 같은 이름)
  const [isTyping, setIsTyping] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (next) => {
      if (!disabled) setOpen(next);
    },
    placement: 'bottom-start',
    middleware: [offset(6), shift()],
    whileElementsMounted: autoUpdate,
  });
  // floating-ui 의 콜백 ref. refs.setX 를 JSX 에서 읽으면 React 규칙이 렌더 중 ref 접근으로 본다
  const { setReference, setFloating } = refs;

  const found = items.findIndex((item) => item.key === value);
  const selectedIndex = found === -1 ? null : found;
  const selectedItem = selectedIndex === null ? undefined : items[selectedIndex];
  const displayLabel = !value || value === '' ? placeholder : (selectedItem?.value ?? placeholder);

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useClick(context, { enabled: !disabled }),
    useDismiss(context),
    useRole(context, { role: 'select' }),
    useListNavigation(context, {
      listRef,
      activeIndex,
      selectedIndex,
      onNavigate: setActiveIndex,
      virtual: true,
      loop: true,
    }),
    useTypeahead(context, {
      listRef: labelsRef,
      activeIndex,
      selectedIndex,
      onMatch: (index) => {
        if (isOpen) setActiveIndex(index);
      },
      onTypingChange: setIsTyping,
      enabled: isOpen,
    }),
  ]);

  const handleSelect = (index: number) => {
    const item = items.at(index);
    if (disabled || !item) return;
    onChange?.(item.key);
    setOpen(false);
  };

  // 열린 상태의 Enter, Space 는 가리킨 항목을 고른다. 기본 동작(버튼 click)은 막아야 다시 열리지 않는다
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen || activeIndex === null) return;
    const isSpace = event.key === ' ' && !isTyping;
    if (event.key !== 'Enter' && !isSpace) return;
    event.preventDefault();
    handleSelect(activeIndex);
  };

  // items가 로드 되고, 값이 비어있을 때 자동으로 첫번째 선택
  useEffect(() => {
    if (autoSelectFirst && items.length > 0 && !value) {
      onChange?.(items[0].key);
    }
  }, [autoSelectFirst, items, value, onChange]);

  const isSelected = value && value !== '' && value !== 'ALL';

  // size에 따른 스타일 클래스 정의
  const sizeClasses = {
    sm: 'h-7 pl-2.5 pr-1 text-xs rounded-md', // 작은 사이즈
    md: 'h-8 pl-3 pr-1.5 text-[13px] rounded-md', // 기본/중간 사이즈
  };

  const buttonSizeClass = sizeClasses[size] || sizeClasses.md;
  // 리스트 아이템의 텍스트 크기도 size에 맞게 조정
  const listItemSizeClass = size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-[13px] px-3 py-1.5';

  return (
    <div className={`relative inline-block ${className}`}>
      {/* 버튼(combobox). 이름은 placeholder, 값은 버튼 글자로 읽힌다 */}
      <button
        ref={setReference}
        type="button"
        aria-label={placeholder}
        disabled={disabled}
        {...getReferenceProps({ onKeyDown: handleKeyDown })}
        className={`inline-flex items-center border transition-colors whitespace-nowrap focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
                    ${buttonSizeClass}
                    ${
                      disabled
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium hover:bg-blue-100 cursor-pointer'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
                    }
                  `}
      >
        <span>{displayLabel}</span>
        <span className="pl-1.5 text-gray-400">
          <i aria-hidden="true" className="ri-arrow-down-s-line"></i>
        </span>
      </button>

      {/* 드롭다운 리스트(listbox) */}
      {isOpen && (
        <PopoverPortal>
          <ul
            ref={setFloating}
            style={floatingStyles}
            aria-label={placeholder}
            {...getFloatingProps()}
            className="z-popover max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-md max-w-[200px] min-w-[112px] overscroll-contain focus:outline-none"
          >
            {items.length > 0 ? (
              items.map((item, index) => {
                const selected = index === selectedIndex;
                const active = index === activeIndex;
                const borderRadiusClass =
                  index === 0 ? 'rounded-t-md' : index === items.length - 1 ? 'rounded-b-md' : '';
                return (
                  <li
                    key={item.key}
                    ref={(node) => {
                      listRef.current[index] = node;
                      labelsRef.current[index] = item.value;
                    }}
                    {...getItemProps({
                      active,
                      selected,
                      onClick: () => handleSelect(index),
                    })}
                    className={`${listItemSizeClass} truncate cursor-pointer
                            ${borderRadiusClass}
                            ${selected ? 'text-blue-700 font-medium' : 'text-gray-800'}
                            ${active ? 'bg-gray-100' : selected ? 'bg-blue-50' : ''}
                          `}
                  >
                    {item.value}
                  </li>
                );
              })
            ) : (
              // 고를 항목이 없다. 값을 '' 로 바꾸면 상태 유니온 밖의 값이 필터로 나간다
              <li
                role="option"
                aria-selected={false}
                aria-disabled="true"
                className="w-full px-4 py-2 text-sm text-gray-400"
              >
                {emptyText}
              </li>
            )}
          </ul>
        </PopoverPortal>
      )}
    </div>
  );
}
