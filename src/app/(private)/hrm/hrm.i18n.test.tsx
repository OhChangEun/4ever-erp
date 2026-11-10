import { describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/i18n/messages/en.json';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { ModalProvider } from '@/app/components/common/modal/ModalProvider';
import { ToastProvider } from '@/app/components/common/toast/ToastProvider';
import HrmClient from './HrmClient';
import HrmLayout from './layout';
import EmployeesTab from './components/tabs/subTab/employeeTab/EmployeesTab';
import LeaveTab from './components/tabs/subTab/attendanceTab/LeaveTab';
import EmployeeTrainingTab from './components/tabs/subTab/trainingTab/EmployeeTrainingTab';
import AttendanceHeatmap from './components/heatmap/AttendanceHeatmap';
import PayrollManagement from './components/tabs/mainTab/PayrollManagement';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/hrm',
}));

// 레이아웃 시험용. 앱 Providers 는 MSW 켜기와 개발 도구까지 들고 있어 테스트와 같은 것만 남긴다
vi.mock('@/app/(private)/_RouteProviders', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <ModalProvider>{children}</ModalProvider>
      </ToastProvider>
    </QueryClientProvider>
  ),
}));

describe('인사 화면 영어(i18n 7)', () => {
  it('탭 이름과 통계 카드 제목이 영어, 인원 수에 단위 "명"이 붙지 않는다', async () => {
    renderWithProviders(<HrmClient />, { locale: 'en' });
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(await within(metrics).findByText('Total employees')).toBeInTheDocument();
    expect(within(metrics).getByText('New hires')).toBeInTheDocument();
    expect(within(metrics).queryByText(/명/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Payroll' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attendance' })).toBeInTheDocument();
  });

  it('한국어 탭과 통계 카드는 예전과 같다(총 직원 수 1,200명)', async () => {
    renderWithProviders(<HrmClient />);
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(await within(metrics).findByText('총 직원 수')).toBeInTheDocument();
    expect(within(metrics).getAllByText('1,200명').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '직원관리' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '직원정보' })).toBeInTheDocument();
  });

  it('직원 목록의 표 머리, 버튼, 상세 모달이 영어', async () => {
    renderWithProviders(<EmployeesTab />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'Hire date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Department / Position' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'View details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Employee details' });
    expect(within(dialog).getByText('Date of birth')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('휴가 목록의 일수는 영어 복수형, 한국어는 예전과 같다', async () => {
    const { unmount } = renderWithProviders(<LeaveTab />, { locale: 'en' });
    expect(await screen.findByText('2 days')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Annual leave left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    unmount();
    renderWithProviders(<LeaveTab />);
    expect(await screen.findByText('2일')).toBeInTheDocument();
    expect(screen.getByText('8일')).toBeInTheDocument();
  });

  it('직원별 교육 표의 단위와 모달 제목이 영어', async () => {
    renderWithProviders(<EmployeeTrainingTab />, { locale: 'en' });
    expect(await screen.findByText('courses')).toBeInTheDocument();
    expect(screen.getByText('incomplete')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Training for 홍길동' });
    expect(await within(dialog).findByText('Training history')).toBeInTheDocument();
    expect(within(dialog).getByText('Completed: 2026-01-05')).toBeInTheDocument();
  });

  it('급여 목록의 연도와 월 선택, 표 머리가 영어', async () => {
    renderWithProviders(<PayrollManagement />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'Net pay' })).toBeInTheDocument();
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    expect(screen.getByText(String(now.getFullYear()))).toBeInTheDocument();
    expect(screen.getByText(month)).toBeInTheDocument();
  });

  it('한국어 급여 연도와 월 선택은 예전과 같다', async () => {
    renderWithProviders(<PayrollManagement />);
    await screen.findByRole('columnheader', { name: '실지급액' });
    const now = new Date();
    expect(screen.getByText(`${now.getFullYear()}년`)).toBeInTheDocument();
    expect(screen.getByText(`${now.getMonth() + 1}월`)).toBeInTheDocument();
  });
});

describe('근태 잔디 영어(i18n 7)', () => {
  it('그림 이름, 요약, 칸 title 이 영어이고 날짜는 영어 날짜', async () => {
    renderWithProviders(<AttendanceHeatmap selectedDate={null} onSelect={() => {}} />, {
      locale: 'en',
    });
    const img = await screen.findByRole('img', { name: 'Attendance issues heatmap (12 weeks)' });
    expect(screen.getByRole('region', { name: 'Attendance heatmap' })).toContainElement(img);
    expect(screen.getByText(/^Last 12 weeks: \d+ workdays,/)).toBeInTheDocument();
    const title = img.querySelector('rect[data-date] title')?.textContent ?? '';
    expect(title).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}: /);
    expect(img.textContent).toContain('Mon');
    expect(img.textContent).not.toMatch(/[가-힣]/);
  });

  it('한국어 칸 title 과 달 이름은 예전과 같다', async () => {
    renderWithProviders(<AttendanceHeatmap selectedDate={null} onSelect={() => {}} />);
    const img = await screen.findByRole('img', { name: '근태 이상 잔디(12주)' });
    const filled = Array.from(img.querySelectorAll('rect[data-date] title')).map(
      (node) => node.textContent,
    );
    expect(
      filled.some((text) => /^\d{4}-\d{2}-\d{2} 지각 \d+, 결근 \d+, 휴가 \d+ \/ 40명$/.test(text)),
    ).toBe(true);
    expect(img.textContent).toMatch(/\d{1,2}월/);
    expect(screen.getByText(/가장 많은 날은/)).toHaveTextContent(/\d{4}-\d{2}-\d{2}\(\d+건\)/);
  });
});

describe('인사 레이아웃(i18n 7)', () => {
  it('인사 레이아웃이 인사 메시지를 준다. 모달 안 문구도 영어', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Seoul">
        <HrmLayout>
          <EmployeesTab />
        </HrmLayout>
      </NextIntlClientProvider>,
    );
    // 영어 메시지는 받은 뒤에 바뀐다
    await userEvent.click(await screen.findByRole('button', { name: 'Add employee' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add employee' });
    expect(await within(dialog).findByText('Hire date')).toBeInTheDocument();
  });
});
