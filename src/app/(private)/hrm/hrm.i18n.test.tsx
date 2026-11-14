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
import { optionTexts } from '@/test/dropdownOptions';
import { mockApi } from '@/test/mockApi';
import * as z from 'zod';

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
    const metrics = await screen.findByRole('region', { name: 'Metrics' });
    expect(await within(metrics).findByText('Total employees')).toBeInTheDocument();
    expect(within(metrics).getByText('New hires')).toBeInTheDocument();
    expect(within(metrics).queryByText(/명/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Payroll' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attendance' })).toBeInTheDocument();
  });

  it('한국어 탭과 통계 카드는 예전과 같다(총 직원 수 40명)', async () => {
    renderWithProviders(<HrmClient />);
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(await within(metrics).findByText('총 직원 수')).toBeInTheDocument();
    // 근태 집계의 인원(카드 "목 데이터 현실성")
    expect(within(metrics).getAllByText('40명').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '직원관리' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '직원정보' })).toBeInTheDocument();
  });

  it('직원 목록의 표 머리, 버튼, 상세 모달이 영어', async () => {
    renderWithProviders(<EmployeesTab />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'Hire date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Department / Position' })).toBeInTheDocument();
    // 직원이 42명이라 첫 행(홍길동)의 버튼을 누른다(카드 "데모 데이터 채우기")
    const row = within(await screen.findByRole('row', { name: /홍길동/ }));
    await userEvent.click(row.getByRole('button', { name: 'View details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Employee details' });
    expect(within(dialog).getByText('Date of birth')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('휴가 목록의 일수는 영어 복수형, 한국어는 예전과 같다', async () => {
    // 휴가가 여럿이라 대기 휴가 leave-001(홍길동, 2일) 행으로 좁힌다. 남은 연차는 지난 승인 휴가 수로 정해져 목에서 꺼낸다
    // (카드 "데모 목록 인사 재무")
    const leave = z
      .object({
        data: z.object({
          content: z.array(
            z.object({ leaveRequestId: z.string(), remainingLeaveDays: z.number() }),
          ),
        }),
      })
      .parse(await mockApi('GET', '/business/hrm/leave-request?page=0&size=1000'))
      .data.content.find((row) => row.leaveRequestId === 'leave-001');
    const pendingRow = async (approve: string) => {
      const rows = await screen.findAllByRole('row', { name: /홍길동/ });
      const row = rows.find((item) => within(item).queryByRole('button', { name: approve }));
      if (!row) throw new Error('홍길동의 대기 휴가 행이 없다');
      return within(row);
    };
    const { unmount } = renderWithProviders(<LeaveTab />, { locale: 'en' });
    expect((await pendingRow('Approve')).getByText('2 days')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Annual leave left' })).toBeInTheDocument();
    unmount();
    renderWithProviders(<LeaveTab />);
    const row = await pendingRow('승인');
    expect(row.getByText('2일')).toBeInTheDocument();
    expect(row.getByText(`${leave?.remainingLeaveDays}일`)).toBeInTheDocument();
  });

  it('직원별 교육 표의 단위와 모달 제목이 영어', async () => {
    renderWithProviders(<EmployeeTrainingTab />, { locale: 'en' });
    // 재직자 40명이라 홍길동 행으로 좁힌다. 홍길동은 5과정 이수, 이수일 중 하나가 화재 대피 훈련 2026-03-12
    // (카드 "데모 목록 인사 재무")
    const row = within(await screen.findByRole('row', { name: /홍길동/ }));
    expect(row.getByText('courses')).toBeInTheDocument();
    expect(row.getByText('incomplete')).toBeInTheDocument();
    await userEvent.click(row.getByRole('button', { name: 'Details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Training for 홍길동' });
    expect(await within(dialog).findByText('Training history')).toBeInTheDocument();
    expect(within(dialog).getByText('Completed: 2026-03-12')).toBeInTheDocument();
  });

  it('급여 목록의 연도와 월 선택, 표 머리가 영어', async () => {
    renderWithProviders(<PayrollManagement />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'Net pay' })).toBeInTheDocument();
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    expect(screen.getByText(String(now.getFullYear()))).toBeInTheDocument();
    expect(screen.getByText(month)).toBeInTheDocument();
  });

  it('급여 상태 필터 항목이 영어(서버가 주는 상태 코드는 status 메시지로)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PayrollManagement />, { locale: 'en' });
    await screen.findByRole('columnheader', { name: 'Net pay' });
    expect(await optionTexts(user, screen.getByRole('combobox', { name: 'All statuses' }))).toEqual(
      ['All', 'Not paid out', 'Paid out'],
    );
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
