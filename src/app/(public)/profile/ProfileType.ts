export interface EmploymentInfoProps {
  isEditing: boolean;
  setIsEditing: (show: boolean) => void;
}

export interface ProfileHeaderProps {
  isEditing: boolean;
  setIsEditing: (show: boolean) => void;
}

export interface EditUserRequest {
  email?: string;
  phoneNumber: string;
  address: string;
}

export interface RequestVacation {
  leaveType: string;
  startDate: string;
  endDate: string;
}

export interface ProfileInfoResponse {
  name: string;
  employeeNumber: string;
  department: string;
  position: string;
  hireDate: string;
  serviceYears: string;
  email: string;
  phoneNumber: string;
  address: string;
}

export interface AttendanceRecordsResponse {
  date: string;
  status: string;
  startTime: string;
  endTime: string;
  workHours: string;
}

export interface TodayAttendResponse {
  checkInTime: string;
  checkOutTime: string;
  workHours: string;
  status: string;
}

export interface TrainingResponse {
  trainingId: string;
  trainingName: string;
  trainingStatus: string;
  durationHours: number;
  delieveryMethod: string;
  completionStatus: string;
  category: string;
  description: string;
  complementationDate: string;
}
