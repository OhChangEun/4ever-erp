'use client';

import { useEffect, useState } from 'react';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { PopoverPortal } from '@everp/ui';
import { parseDateKey, toDateKey } from '@/app/utils/date';
import { Button } from '@everp/ui';
import { IconButton } from '@everp/ui';
import CalendarGrid from './CalendarGrid';

interface CalendarButtonProps {
  /** 현지 날짜 YYYY-MM-DD */
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * 날짜 하나를 고르는 버튼과 달력 팝업. 성능 2 카드에서 MUI StaticDatePicker 를 자체 CalendarGrid 로 바꿨다.
 * 팝업은 dialog. 열면 달력의 날짜 칸으로 포커스가 가고, Esc 나 바깥 클릭으로 닫으면 버튼으로 돌아온다.
 */
export default function CalendarButton({
  selectedDate,
  onDateChange,
  placeholder = '날짜 선택',
  // 생년월일도 고를 수 있게 1940년부터(예전 MUI 기본값 2000-01-01 은 2000년 이전 생년월일을 막았다)
  minDate = new Date(1940, 0, 1),
  maxDate = new Date(2030, 11, 31),
}: CalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    open: isOpen,
  });
  // floating-ui 의 콜백 ref. refs.setX 를 JSX 에서 읽으면 React 규칙이 렌더 중 ref 접근으로 본다
  const { setReference, setFloating } = refs;

  // 닫을 때 달력을 연 버튼으로 포커스를 돌린다(키보드 사용자가 자리를 잃지 않게)
  const focusTrigger = () =>
    refs.domReference.current?.querySelector<HTMLButtonElement>('button')?.focus();

  const close = () => {
    setIsOpen(false);
    focusTrigger();
  };

  const handleSelect = (date: Date) => {
    onDateChange(toDateKey(date));
    close();
  };

  const handleReset = () => {
    onDateChange(null);
    close();
  };

  // 바깥 클릭과 Esc 로 닫기. 열리면 달력의 지금 날짜 칸으로 포커스를 옮긴다
  useEffect(() => {
    if (!isOpen) return;
    refs.floating.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (
        !refs.floating.current?.contains(target) &&
        !refs.domReference.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      refs.domReference.current?.querySelector<HTMLButtonElement>('button')?.focus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, refs]);

  return (
    <div className="relative inline-block">
      <div ref={setReference}>
        <IconButton
          type="button"
          icon="ri-calendar-line"
          label={selectedDate || placeholder}
          variant={selectedDate ? 'soft' : 'secondary'}
          size="sm"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        />
      </div>

      {isOpen && (
        <PopoverPortal>
          <div
            ref={setFloating}
            style={floatingStyles}
            role="dialog"
            aria-label="날짜 선택"
            className="z-popover bg-white rounded-md shadow-lg border border-gray-200 animate-fadeIn"
          >
            <CalendarGrid
              value={parseDateKey(selectedDate)}
              onSelect={handleSelect}
              minDate={minDate}
              maxDate={maxDate}
            />
            <div className="flex justify-end px-3 pb-3">
              <Button label="초기화" variant="ghost" size="sm" onClick={handleReset} />
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}
