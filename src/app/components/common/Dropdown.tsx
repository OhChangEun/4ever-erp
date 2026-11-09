import { KeyValueItem } from '@/app/types/CommonType';
import { autoUpdate, FloatingPortal, offset, shift, useFloating } from '@floating-ui/react';
import { useEffect, useState } from 'react';

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

  const handleSelect = (key: T) => {
    if (disabled) return;
    onChange?.(key);
    setOpen(false);
  };

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && e.target instanceof Node && !refs.floating.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, refs]);

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
          disabled={disabled}
        >
          <span>{displayLabel}</span>
          <span className="pl-1.5 text-gray-400">
            <i aria-hidden="true" className="ri-arrow-down-s-line"></i>
          </span>
        </button>
      </div>

      {/* 드롭다운 리스트 */}
      {open && !disabled && (
        <FloatingPortal>
          <ul
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-popover max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-md max-w-[200px] min-w-[112px] overscroll-contain"
          >
            {items.length > 0 ? (
              items.map((item, index) => {
                const isSelected = item.key === selectedItem?.key;
                const borderRadiusClass =
                  index === 0 ? 'rounded-t-md' : index === items.length - 1 ? 'rounded-b-md' : '';
                // 리스트 아이템의 텍스트 크기도 size에 맞게 조정 (sm일 때 text-sm 유지, md일 때 text-sm 유지)
                const listItemSizeClass =
                  size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-[13px] px-3 py-1.5';
                return (
                  <li
                    key={item.key}
                    onClick={() => {
                      handleSelect(item.key);
                    }}
                    className={`${listItemSizeClass} truncate cursor-pointer
                            ${borderRadiusClass}
                            ${isSelected ? 'text-blue-700 bg-blue-50 font-medium' : 'text-gray-800 hover:bg-gray-50'}
                          `}
                  >
                    {item.value}
                  </li>
                );
              })
            ) : (
              <li
                className="w-full px-4 py-2 text-sm text-gray-400"
                onClick={() => setOpen(false)} // 고를 항목이 없다. 값을 '' 로 바꾸면 상태 유니온 밖의 값이 필터로 나간다
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
