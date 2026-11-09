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

// Date → YYYY-MM-DD(현지 날짜)
// 예전엔 toISOString()(UTC)을 써서 한국 시간 자정 날짜가 전날이 됐다(성능 2 카드에서 찾은 결함)
export const formatDate = (date: Date | null): string | null => {
  if (!date || isNaN(date.getTime())) return null;
  return toDateKey(date);
};

// ---- 달력용 현지 날짜 도구. 모든 Date 는 현지 자정으로 다룬다 ----

/** Date → 현지 YYYY-MM-DD */
export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** YYYY-MM-DD → 현지 자정 Date. new Date('YYYY-MM-DD') 는 UTC 자정이라 쓰지 않는다 */
export const parseDateKey = (value: string | null | undefined): Date | null => {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isNaN(date.getTime()) ? null : date;
};

export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** 달을 옮긴다. 31일에서 2월로 가면 2월 말일로 맞춘다 */
export const addMonths = (date: Date, months: number): Date => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// YYYY-MM-DD → ISO
export const toISOString = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  return date.toISOString();
};
