'use client';

import { useState } from 'react';
import Dropdown from './Dropdown';
import Input from './Input';
import { type KeyValueItem } from './types';
import { useUiText } from './UiText';

interface SearchBarProps {
  /** 검색 타입 옵션 */
  options: KeyValueItem[];
  /** 검색 실행 시 호출되는 콜백 */
  onTypeChange: (type: string) => void;
  onKeywordSearch: (keyword: string) => void;
  /** placeholder (선택 사항) */
  placeholder?: string;
  autoSelectFirst?: boolean;
  disabled?: boolean;
}

export default function SearchBar({
  options,
  onTypeChange,
  onKeywordSearch,
  autoSelectFirst = true,
  placeholder,
  disabled,
}: SearchBarProps) {
  const text = useUiText().searchBar;
  const [selectedType, setSelectedType] = useState('');
  const [keyword, setKeyword] = useState('');

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    onTypeChange(type);
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    onKeywordSearch(value); // 부모에게 전달 (디바운스용)
  };

  return (
    <div className="flex gap-2">
      <Dropdown
        placeholder={text.typePlaceholder}
        items={options}
        value={selectedType}
        onChange={handleTypeChange}
        autoSelectFirst={autoSelectFirst}
        disabled={disabled}
      />
      <Input
        value={keyword}
        onChange={handleKeywordChange}
        icon="ri-search-line"
        placeholder={placeholder ?? text.keywordPlaceholder}
      />
    </div>
  );
}
