'use client';

import { useState, useEffect } from 'react';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { formatDate } from '@/app/utils/date';
import Button from './Button';
import IconButton from './IconButton';
import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from '@floating-ui/react';

interface CalendarButtonProps {
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

export default function CalendarButton({
  selectedDate,
  onDateChange,
  placeholder = '날짜 선택',
  minDate = new Date(1999, 12, 1),
  maxDate = new Date(2030, 11, 31),
}: CalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // floating-ui
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    open: isOpen,
  });

  const dateValue = selectedDate ? new Date(selectedDate) : null;

  const handleSelect = (newDate: Date | null) => {
    onDateChange(formatDate(newDate));
    setIsOpen(false);
  };

  const handleReset = () => {
    onDateChange(null);
    setIsOpen(false);
  };

  // 클릭 외부 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        isOpen &&
        !refs.floating.current?.contains(target) &&
        !refs.domReference.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, refs]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="relative inline-block">
        {/* 버튼 */}
        <div ref={refs.setReference}>
          <IconButton
            type="button"
            icon="ri-calendar-line"
            label={selectedDate || placeholder}
            variant={selectedDate ? 'soft' : 'secondary'}
            size="sm"
            onClick={() => setIsOpen((prev) => !prev)}
          />
        </div>

        {/* FloatingPortal */}
        {isOpen && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-popover bg-white rounded-md shadow-lg border border-gray-200 pb-6 animate-fadeIn"
            >
              <StaticDatePicker
                displayStaticWrapperAs="desktop"
                value={dateValue}
                onChange={handleSelect}
                minDate={minDate}
                maxDate={maxDate}
                slotProps={{
                  actionBar: { actions: [] },
                }}
              />

              {/* 초기화 버튼 */}
              <div className="absolute bottom-3 right-3 flex justify-end">
                <Button label="초기화" variant="ghost" size="sm" onClick={handleReset} />
              </div>
            </div>
          </FloatingPortal>
        )}
      </div>
    </LocalizationProvider>
  );
}
