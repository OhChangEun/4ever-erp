export const getMovementIcon = (type: string) => {
  const icons: Partial<Record<string, string>> = {
    입고: 'ri-arrow-down-line',
    출고: 'ri-arrow-up-line',
    이동: 'ri-arrow-left-right-line',
  };
  return icons[type] ?? '';
};

export const getMovementColor = (type: string) => {
  const colors: Partial<Record<string, string>> = {
    입고: 'text-green-600 bg-green-100',
    출고: 'text-red-600 bg-red-100',
    이동: 'text-blue-600 bg-blue-100',
  };
  return colors[type] ?? '';
};

export const FormatDate = (date: string) => {
  return date.replace('T', ' ').slice(0, 16);
};
