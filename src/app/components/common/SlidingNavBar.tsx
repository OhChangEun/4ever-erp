import { useRef, useEffect, useState } from 'react';
import { KeyValueItem } from '@/app/types/CommonType';

// 키 타입(T)이 onSelect 까지 이어진다. 받는 쪽이 string 을 다시 단언하지 않는다
interface SlidingNavBarProps<T extends string = string> {
  items: KeyValueItem<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
}

/** 세그먼트 컨트롤. 회색 트랙 위에 흰색 선택 칩이 미끄러진다. */
export default function SlidingNavBar<T extends string = string>({
  items,
  selectedKey,
  onSelect,
}: SlidingNavBarProps<T>) {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const selectedIndex = items.findIndex((item) => item.key === selectedKey);
    const activeButton = navRefs.current[selectedIndex];

    if (activeButton) {
      setIndicatorStyle({
        left: `${activeButton.offsetLeft}px`,
        width: `${activeButton.offsetWidth}px`,
      });
    }
  }, [selectedKey, items]);

  return (
    <div role="group" className="relative inline-flex items-center bg-gray-100 rounded-md p-0.5">
      {/* 슬라이딩 인디케이터 */}
      <div
        className="absolute top-0.5 bottom-0.5 bg-white border border-gray-200 rounded transition-all duration-200 ease-out pointer-events-none"
        style={indicatorStyle}
      />

      <div className="flex">
        {items.map((item, index) => {
          const isSelected = selectedKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              ref={(el) => {
                navRefs.current[index] = el;
              }}
              onClick={() => onSelect(item.key)}
              aria-pressed={isSelected}
              className={`relative z-local whitespace-nowrap cursor-pointer rounded px-2.5 h-7 text-xs transition-colors ${
                isSelected ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {item.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
