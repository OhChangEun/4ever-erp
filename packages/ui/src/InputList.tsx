'use client';

import { useState } from 'react';
import { type KeyValueItem } from './types';
import IconButton from './IconButton';
import { useUiText } from './UiText';

// 키는 1부터 늘어나는 번호다. 예전엔 제네릭 T 를 받아 문자열 키면 "3" + 1 = "31" 이 됐다
interface InputListProps {
  initialItems?: KeyValueItem<number>[];
  onChange?: (items: KeyValueItem<number>[]) => void;
}

export default function InputList({ initialItems = [], onChange }: InputListProps) {
  const text = useUiText().inputList;
  const [items, setItems] = useState<KeyValueItem<number>[]>(initialItems);

  // 값 변경
  const handleChange = (key: number, value: string) => {
    const newItems = items.map((item) => (item.key === key ? { ...item, value } : item));
    setItems(newItems);
    onChange?.(newItems);
  };

  // 새로운 항목 추가
  const handleAdd = () => {
    const newKey = items.length ? items[items.length - 1].key + 1 : 1; // 숫자 키 기준 자동 증가
    const newItem: KeyValueItem<number> = {
      key: newKey,
      value: '',
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    onChange?.(newItems);
  };

  // 항목 삭제
  const handleRemove = (key: number) => {
    const newItems = items.filter((item) => item.key !== key);
    setItems(newItems);
    onChange?.(newItems);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center px-2 pb-3">
        <h1>{text.title}</h1>
        <IconButton
          label={text.add}
          variant="secondary"
          icon="ri-add-line"
          size="sm"
          onClick={handleAdd}
        />
      </div>

      {items.map((item, index) => (
        <div key={item.key} className="flex items-center">
          <span className="w-5 flex justify-center">{index + 1}</span>
          <input
            type="text"
            value={item.value}
            onChange={(e) => handleChange(item.key, e.target.value)}
            className="h-8 ml-3 border p-2 rounded"
          />
          <IconButton
            icon="ri-close-line"
            label=""
            className="bg-white !text-gray-400"
            size="lg"
            onClick={() => handleRemove(item.key)}
          />
        </div>
      ))}
    </div>
  );
}
