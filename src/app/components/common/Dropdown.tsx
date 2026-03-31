import { KeyValueItem } from '@/app/types/CommonType';
import { autoUpdate, FloatingPortal, offset, shift, useFloating } from '@floating-ui/react';
import { useEffect, useState } from 'react';

// size prop 추가
interface DropdownProps<T extends string = string> {
  placeholder: string;
  items: KeyValueItem[]; // options
  value: T; // 선택된 값
  onChange?: (key: T) => void;
  className?: string;
  autoSelectFirst?: boolean;
  size?: 'sm' | 'md'; // 'sm' 또는 'md' 사이즈 추가
  disabled?: boolean;
}

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
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(6), shift()],
    whileElementsMounted: autoUpdate,
  });

  const selectedItem = items.find((item) => item.key === value);
  const displayLabel = !value || value === '' ? placeholder : (selectedItem?.value ?? placeholder);

  const handleSelect = (key: string) => {
    if (disabled) return;
    onChange?.(key as T);
    setOpen(false);
  };

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (open && !refs.floating.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, refs]);

  // items가 로드 되고, 값이 비어있을 때 자동으로 첫번째 선택
  useEffect(() => {
    if (autoSelectFirst && items.length > 0 && !value) {
      onChange?.(items[0].key as T);
    }
  }, [autoSelectFirst, items, value, onChange]);

  const isSelected = value && value !== '' && value !== 'ALL';

  // size에 따른 스타일 클래스 정의
  const sizeClasses = {
    sm: 'pl-3 pr-1 py-1.5 text-xs rounded-md', // 작은 사이즈
    md: 'pl-4 pr-1.5 py-1.5 text-sm rounded-lg', // 기본/중간 사이즈
  };

  const buttonSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* 버튼 */}
      <div ref={refs.setReference}>
        <button
          type="button"
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
          }}
          className={`font-medium focus:outline-none transition whitespace-nowrap
                    ${buttonSizeClass} 
                    ${
                      disabled
                        ? 'bg-gray-100 text-gray-300'
                        : isSelected
                          ? 'bg-blue-100 text-blue-500 hover:bg-blue-200/70 cursor-pointer'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                    }
                  `}
          disabled={disabled}
        >
          <span>{displayLabel}</span>
          <span className="pl-2">
            <i className="ri-arrow-down-s-line"></i>
          </span>
        </button>
      </div>

      {/* 드롭다운 리스트 */}
      {open && !disabled && (
        <FloatingPortal>
          <ul
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-popover max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg max-w-[160px] min-w-[96px] animate-fadeIn overscroll-contain"
          >
            {items.length > 0 ? (
              items.map((item, index) => {
                const isSelected = item.key === selectedItem?.key;
                const borderRadiusClass =
                  index === 0 ? 'rounded-t-lg' : index === items.length - 1 ? 'rounded-b-lg' : '';
                // 리스트 아이템의 텍스트 크기도 size에 맞게 조정 (sm일 때 text-sm 유지, md일 때 text-sm 유지)
                const listItemSizeClass =
                  size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2';
                return (
                  <li
                    key={item.key}
                    onClick={() => {
                      handleSelect(item.key);
                    }}
                    className={`${listItemSizeClass} truncate cursor-pointer
                            ${borderRadiusClass}
                            ${isSelected ? 'text-blue-500 bg-blue-50' : 'text-gray-800 hover:bg-blue-50'}
                          `}
                  >
                    {item.value}
                  </li>
                );
              })
            ) : (
              <li
                className="w-full px-4 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelect('')} // 선택된 값이 없음을 의미
              >
                항목 없음
              </li>
            )}
          </ul>
        </FloatingPortal>
      )}
    </div>
  );
}
