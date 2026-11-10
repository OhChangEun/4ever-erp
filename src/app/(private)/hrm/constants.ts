import { type Tab } from '@/app/types/NavigationType';
import EmployeeManagement from '@/app/(private)/hrm/components/tabs/mainTab/EmployeeManagement';
import PayrollManagement from '@/app/(private)/hrm/components/tabs/mainTab/PayrollManagement';
import AttendanceManagement from '@/app/(private)/hrm/components/tabs/mainTab/AttendanceManagement';
import TrainingManagement from '@/app/(private)/hrm/components/tabs/mainTab/TrainingManagement';
import EmployeesTab from '@/app/(private)/hrm/components/tabs/subTab/employeeTab/EmployeesTab';
import DepartmentsTab from '@/app/(private)/hrm/components/tabs/subTab/employeeTab/DepartmentsTab';
import AttendanceTab from '@/app/(private)/hrm/components/tabs/subTab/attendanceTab/AttendanceTab';
import LeaveTab from '@/app/(private)/hrm/components/tabs/subTab/attendanceTab/LeaveTab';
import AvailableProgramTab from '@/app/(private)/hrm/components/tabs/subTab/trainingTab/AvailableProgramTab';
import EmployeeTrainingTab from '@/app/(private)/hrm/components/tabs/subTab/trainingTab/EmployeeTrainingTab';

// main tab - hrm 탭 전환
export const HRM_TABS: Tab[] = [
  {
    id: 'employee-management',
    name: '직원관리',
    icon: 'ri-user-settings-line',
    component: EmployeeManagement,
  },
  {
    id: 'payroll-management',
    name: '급여관리',
    icon: 'ri-money-dollar-circle-line',
    component: PayrollManagement,
  },
  {
    id: 'attendance-management',
    name: '근태관리',
    icon: 'ri-time-line',
    component: AttendanceManagement,
  },
  {
    id: 'training-management',
    name: '교육관리',
    icon: 'ri-graduation-cap-line',
    component: TrainingManagement,
  },
];

// sub tab - 직원관리 탭
export const HR_TABS: Tab[] = [
  {
    id: 'employees',
    name: '직원정보',
    icon: 'ri-user-line',
    component: EmployeesTab,
  },
  {
    id: 'organization',
    name: '부서관리',
    icon: 'ri-building-line',
    component: DepartmentsTab,
  },
];

// sub tab - 근태관리 탭
export const ATTENDANCE_TABS: Tab[] = [
  {
    id: 'attendance',
    name: '출퇴근 기록',
    icon: 'ri-time-line',
    component: AttendanceTab,
  },
  {
    id: 'leave',
    name: '휴가 관리',
    icon: 'ri-calendar-line',
    component: LeaveTab,
  },
];

// sub tab - 교육관리 탭
export const TRAINING_TABS: Tab[] = [
  {
    id: 'attendance',
    name: '직원별 교육 상태',
    icon: 'ri-time-line',
    component: EmployeeTrainingTab,
  },
  {
    id: 'leave',
    name: '교육 프로그램 목록',
    icon: 'ri-calendar-line',
    component: AvailableProgramTab,
  },
];
