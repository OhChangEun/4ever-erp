// 분 → x시 y분
export const formatMinutesToHourMin = (minutes: number) => {
  if (minutes == null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시 ${m}분`;
};

// ISO → HH:mm
export const formatTime = (isoString: string) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// ISO → YYYY-MM-DD HH:mm:ss
export const formatDateTime = (isoString: string): string => {
  if (!isoString) return '-';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// Date → YYYY-MM-DD
export const formatDate = (date: Date | null): string | null => {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

// YYYY-MM-DD → ISO
export const toISOString = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  return date.toISOString();
};
