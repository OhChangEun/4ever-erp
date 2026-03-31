import { useRef, useEffect, useState } from 'react';
import { KeyValueItem } from '@/app/types/CommonType';

interface SlidingNavBarProps {
  items: KeyValueItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export default function SlidingNavBar({ items, selectedKey, onSelect }: SlidingNavBarProps) {
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
    <div className="relative inline-flex items-center bg-white rounded-md border border-gray-200 p-0.5 gap-0.5">
      {/* 슬라이딩 인디케이터 */}
      <div
        className="absolute top-0.5 bottom-0.5 bg-blue-500 rounded transition-all duration-300 ease-out pointer-events-none"
        style={indicatorStyle}
      />

      {/* 버튼들 */}
      <div className="flex gap-0.5">
        {items.map((item, index) => (
          <button
            key={item.key}
            ref={(el) => {
              navRefs.current[index] = el;
            }}
            onClick={() => onSelect(item.key)}
            className={`relative z-local whitespace-nowrap cursor-pointer rounded px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
              selectedKey === item.key ? 'text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.value}
          </button>
        ))}
      </div>
    </div>
  );
}
