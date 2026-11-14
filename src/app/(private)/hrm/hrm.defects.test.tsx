import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { HRM_BASE_PATH } from './api/hrm.endpoints';
import AttendanceTab from './components/tabs/subTab/attendanceTab/AttendanceTab';
import AvailableProgramTab from './components/tabs/subTab/trainingTab/AvailableProgramTab';
import AddEmployeeTrainingModal from './components/modals/AddEmployeeTrainingModal';
import EditProgramModal from './components/modals/ProgramEditModal';
import AddProgramModal from './components/modals/AddProgramModal';
import { TRAINING_TABS } from './constants';
import TrainingManagement from './components/tabs/mainTab/TrainingManagement';

const search = { value: new URLSearchParams() };
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => search.value,
  usePathname: () => '/hrm',
}));

const ok = (data: unknown = null) =>
  HttpResponse.json({ status: 200, success: true, message: 'OK', data });

describe('인사 화면 결함', () => {
  it('근태 상태를 고르면 조회 조건 statusCode 로 서버에 간다', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get(`${HRM_BASE_PATH}/time-record`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('statusCode'));
        return ok({
          content: [],
          page: { number: 0, size: 10, totalElements: 0, totalPages: 0, hasNext: false },
        });
      }),
    );
    renderWithProviders(<AttendanceTab />);
    await userEvent.click(await screen.findByRole('combobox', { name: '전체 상태' }));
    await userEvent.click(await screen.findByRole('option', { name: '지각' }));
    await waitFor(() => expect(seen).toContain('LATE'));
  });

  it('교육 지정 모달은 프로그램을 안 고르면 제출하지 않는다', async () => {
    const posted = vi.fn();
    server.use(
      http.post(`${HRM_BASE_PATH}/program/:employeeId`, () => {
        posted();
        return ok();
      }),
    );
    renderWithProviders(<AddEmployeeTrainingModal id="m" onClose={vi.fn()} employeeId="emp-001" />);
    await userEvent.click(await screen.findByRole('button', { name: '추가' }));
    expect(await screen.findByText('교육 프로그램을 선택해주세요.')).toBeInTheDocument();
    expect(posted).not.toHaveBeenCalled();
  });

  it('프로그램 수정은 고친 이름이 비면 막고, 상태를 안 고르면 지금 상태를 보낸다', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.patch(`${HRM_BASE_PATH}/program/:programId`, async ({ request }) => {
        bodies.push(await request.json());
        return ok();
      }),
    );
    renderWithProviders(
      <EditProgramModal
        id="m"
        onClose={vi.fn()}
        programId="prog-001"
        programName="안전 교육"
        statusCode="ACTIVE"
      />,
    );
    const name = await screen.findByLabelText('교육명');
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole('button', { name: '수정' }));
    expect(await screen.findByText('교육명을 입력해주세요.')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    await userEvent.type(name, '화재 교육');
    await userEvent.click(screen.getByRole('button', { name: '수정' }));
    await waitFor(() =>
      expect(bodies).toEqual([{ programName: '화재 교육', statusCode: 'ACTIVE' }]),
    );
  });

  it('교육 시간은 숫자 칸이라 "8시간" 같은 글자로 NaN 을 보내지 않는다', async () => {
    renderWithProviders(<AddProgramModal id="m" onClose={vi.fn()} />);
    const hours = await screen.findByLabelText('교육 시간');
    expect(hours).toHaveAttribute('type', 'number');
    expect(hours).toHaveAttribute('min', '1');
    expect(hours).not.toHaveAttribute('placeholder', expect.stringContaining('시간'));
  });

  it('교육 프로그램 카드에 온라인 여부가 글자로 보인다', async () => {
    renderWithProviders(<AvailableProgramTab />);
    // 첫 쪽 프로그램 10개 중 온라인과 오프라인이 다섯씩이다(카드 "데모 목록 인사 재무")
    expect(await screen.findAllByText('온라인')).toHaveLength(5);
    expect(screen.getAllByText('오프라인')).toHaveLength(5);
  });

  it('교육관리 하위 탭 id 가 근태관리 탭 id 와 겹치지 않는다', () => {
    expect(TRAINING_TABS.map((tab) => tab.id)).toEqual(['employeeTraining', 'programs']);
  });

  it('예전 주소의 하위 탭 id(subTab=attendance)로 교육관리를 열어도 빈 화면 대신 첫 탭', async () => {
    search.value = new URLSearchParams('tab=training&subTab=attendance');
    try {
      renderWithProviders(<TrainingManagement />);
      const first = await screen.findByRole('button', { name: '직원별 교육 상태' });
      // 선택 표시는 세그먼트의 aria-pressed(예전 밑줄 탭은 border-blue-500 클래스를 봤다)
      expect(first).toHaveAttribute('aria-pressed', 'true');
    } finally {
      search.value = new URLSearchParams();
    }
  });
});
