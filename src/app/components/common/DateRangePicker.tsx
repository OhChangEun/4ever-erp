import { useTranslations } from 'next-intl';
import CalendarButton from './CalendarButton';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  const t = useTranslations('calendar');
  const handleStartDateChange = (date: string | null) => {
    const newStartDate = date || '';

    // 시작 날짜가 끝 날짜보다 이후라면 끝 날짜도 함께 업데이트
    if (newStartDate && endDate && new Date(newStartDate) > new Date(endDate)) {
      onEndDateChange(newStartDate);
    }

    onStartDateChange(newStartDate);
  };

  const handleEndDateChange = (date: string | null) => {
    const newEndDate = date || '';

    // 끝 날짜가 시작 날짜보다 이전이라면 시작 날짜도 함께 업데이트
    if (newEndDate && startDate && new Date(newEndDate) < new Date(startDate)) {
      onStartDateChange(newEndDate);
    }

    onEndDateChange(newEndDate);
  };

  return (
    <div className="flex items-center space-x-1">
      <CalendarButton
        selectedDate={startDate}
        onDateChange={handleStartDateChange}
        placeholder={t('startDate')}
      />
      <span className="text-gray-400 text-sm">~</span>
      <CalendarButton
        selectedDate={endDate}
        onDateChange={handleEndDateChange}
        placeholder={t('endDate')}
      />
    </div>
  );
}
