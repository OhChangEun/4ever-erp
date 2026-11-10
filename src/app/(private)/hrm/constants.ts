import { type Tab } from '@/app/types/NavigationType';
import type hrmKo from '@/i18n/messages/hrm/ko.json';
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

/** name 은 메시지 키(hrm.tabs.<키>). 글자는 탭을 그리는 컴포넌트가 바꾼다 */
export type HrmTab = Omit<Tab, 'name'> & { name: keyof typeof hrmKo.tabs };

// main tab - hrm 탭 전환
export const HRM_TABS: HrmTab[] = [
  {
    id: 'employee-management',
    name: 'employees',
    icon: 'ri-user-settings-line',
    component: EmployeeManagement,
  },
  {
    id: 'payroll-management',
    name: 'payroll',
    icon: 'ri-money-dollar-circle-line',
    component: PayrollManagement,
  },
  {
    id: 'attendance-management',
    name: 'attendance',
    icon: 'ri-time-line',
    component: AttendanceManagement,
  },
  {
    id: 'training-management',
    name: 'training',
    icon: 'ri-graduation-cap-line',
    component: TrainingManagement,
  },
];

// sub tab - 직원관리 탭
export const HR_TABS: HrmTab[] = [
  {
    id: 'employees',
    name: 'employeeInfo',
    icon: 'ri-user-line',
    component: EmployeesTab,
  },
  {
    id: 'organization',
    name: 'departments',
    icon: 'ri-building-line',
    component: DepartmentsTab,
  },
];

// sub tab - 근태관리 탭
export const ATTENDANCE_TABS: HrmTab[] = [
  {
    id: 'attendance',
    name: 'attendanceRecords',
    icon: 'ri-time-line',
    component: AttendanceTab,
  },
  {
    id: 'leave',
    name: 'leave',
    icon: 'ri-calendar-line',
    component: LeaveTab,
  },
];

// sub tab - 교육관리 탭
export const TRAINING_TABS: HrmTab[] = [
  {
    id: 'attendance',
    name: 'employeeTraining',
    icon: 'ri-time-line',
    component: EmployeeTrainingTab,
  },
  {
    id: 'leave',
    name: 'programs',
    icon: 'ri-calendar-line',
    component: AvailableProgramTab,
  },
];
