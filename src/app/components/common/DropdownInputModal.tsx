import { useState, useEffect } from 'react';
import IconButton from '@/app/components/common/IconButton';
import Button from './Button';
import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from '@floating-ui/react';

// 모달 입력 컴포넌트 props 타입 정의
interface DropdownModalProps {
  placeholder: string; // textarea placeholder
  value?: string; // 초기값 (선택 사항)
  rows?: number; // textarea 줄 수
  onSubmit: (value: string) => void; // 제출 시 부모에게 값 전달
}

export default function DropdownInputModal({
  placeholder,
  value = '',
  rows = 5,
  onSubmit,
}: DropdownModalProps) {
  const [isOpen, setIsOpen] = useState(false); // 모달 열림/닫힘 상태
  const [inputValue, setInputValue] = useState(value); // textarea 값 상태

  // floating-ui를 사용해 모달 위치 계산
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start', // 버튼 아래 시작 위치
    middleware: [offset(6), flip(), shift()], // 위치 조정 미들웨어
    whileElementsMounted: autoUpdate, // 요소가 변경될 때 위치 자동 업데이트
  });

  // 부모에서 value가 바뀌면 inputValue 동기화
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 모달 바깥 클릭 시 모달 닫기 및 값 제출
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isOpen && !refs.floating.current?.contains(target)) {
        onSubmit(inputValue); // 빈 값도 포함해서 부모 상태 업데이트
        setIsOpen(false); // 모달 닫기
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, refs, inputValue, onSubmit]);

  // 모달 열기
  const openModal = () => setIsOpen(true);

  // 확인 버튼 클릭 시
  const handleSubmit = () => {
    onSubmit(inputValue); // 부모에게 값 전달
    setIsOpen(false); // 모달 닫기
  };

  return (
    <div className="relative inline-block">
      {/* 모달 열기 버튼 */}
      <div ref={refs.setReference}>
        <IconButton
          type="button"
          icon="ri-pencil-line"
          variant={value.trim() ? 'primary' : 'secondary'} // 값 존재 여부에 따라 버튼 색 변경
          size="sm"
          onClick={openModal}
        />
      </div>

      {/* 모달 영역 */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating} // floating-ui가 위치 제어
            style={floatingStyles} // 계산된 위치 적용
            className="z-popover bg-white border border-gray-200 rounded-xl shadow-3xl p-4 pt-5 pb-2 w-60 animate-fadeIn"
          >
            {/* 입력 textarea */}
            <textarea
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="resize-none w-full border border-gray-300 rounded-lg px-3 py-2 mb-0.5 text-sm focus:border-blue-300 focus:outline-none"
              rows={rows}
            />
            {/* 확인 버튼 */}
            <div className="flex justify-end">
              <Button label="확인" size="sm" onClick={handleSubmit} />
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
