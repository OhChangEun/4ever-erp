export const profileKeys = {
  all: ['profile'] as const,

  info: () => [...profileKeys.all, 'info'] as const,

  todayAttendance: () => [...profileKeys.all, 'todayAttendance'] as const,

  attendanceRecords: () => [...profileKeys.all, 'attendanceRecords'] as const,

  trainings: () => [...profileKeys.all, 'training'] as const,

  training: (tab: string) => [...profileKeys.trainings(), tab] as const,
};
