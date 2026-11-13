import { type Tab } from '@/app/types/NavigationType';
import type { SubTab } from '@/app/components/common/SubNavigation';
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
/** 하위 탭. 화면이 세그먼트(tabButtons)를 받아 툴바 왼쪽에 둔다 */
export type HrmSubTab = Omit<SubTab, 'name'> & { name: keyof typeof hrmKo.tabs };

// main tab - hrm 탭 전환
export const HRM_TABS: HrmTab[] = [
  {
    id: 'employee-management',
    name: 'employees',
    component: EmployeeManagement,
  },
  {
    id: 'payroll-management',
    name: 'payroll',
    component: PayrollManagement,
  },
  {
    id: 'attendance-management',
    name: 'attendance',
    component: AttendanceManagement,
  },
  {
    id: 'training-management',
    name: 'training',
    component: TrainingManagement,
  },
];

// sub tab - 직원관리 탭
export const HR_TABS: HrmSubTab[] = [
  {
    id: 'employees',
    name: 'employeeInfo',
    component: EmployeesTab,
  },
  {
    id: 'organization',
    name: 'departments',
    component: DepartmentsTab,
  },
];

// sub tab - 근태관리 탭
export const ATTENDANCE_TABS: HrmSubTab[] = [
  {
    id: 'attendance',
    name: 'attendanceRecords',
    component: AttendanceTab,
  },
  {
    id: 'leave',
    name: 'leave',
    component: LeaveTab,
  },
];

// sub tab - 교육관리 탭
export const TRAINING_TABS: HrmSubTab[] = [
  {
    id: 'employeeTraining',
    name: 'employeeTraining',
    component: EmployeeTrainingTab,
  },
  {
    id: 'programs',
    name: 'programs',
    component: AvailableProgramTab,
  },
];
