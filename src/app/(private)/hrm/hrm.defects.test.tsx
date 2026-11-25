import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { HRM_BASE_PATH, HRM_ENDPOINTS } from './api/hrm.endpoints';
import DepartmentsTab from './components/tabs/subTab/employeeTab/DepartmentsTab';
import EmployeesTab from './components/tabs/subTab/employeeTab/EmployeesTab';
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

/**
 * 저장 요청이 가는 중에 모달을 닫고 다른 모달을 열 수 있다(Esc 는 막지 않는다).
 * 늦게 온 성공은 자기가 연 모달만 닫아야 한다. 예전엔 removeAllModals 라 새로 연 모달과 입력까지 사라졌다.
 */
describe('늦게 온 저장 성공', () => {
  const hold = (method: 'put' | 'patch', url: string) => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen = vi.fn();
    server.use(
      http[method](url, async () => {
        seen();
        await held;
        return ok();
      }),
    );
    return { release: () => release(), seen };
  };
  const pick = async (
    user: ReturnType<typeof userEvent.setup>,
    dialog: HTMLElement,
    at: number,
  ) => {
    await user.click(within(dialog).getAllByRole('combobox')[at]);
    await user.click((await screen.findAllByRole('option'))[0]);
  };
  const openEmployeeEdit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click((await screen.findAllByRole('button', { name: '상세보기' }))[0]);
    const detail = await screen.findByRole('dialog', { name: '직원 상세보기' });
    await user.click(within(detail).getByRole('button', { name: '수정' }));
    const edit = await screen.findByRole('dialog', { name: '직원정보 수정' });
    await waitFor(() => expect(within(edit).getAllByRole('combobox')).toHaveLength(1));
    await pick(user, edit, 0);
    await waitFor(() => expect(within(edit).getAllByRole('combobox')).toHaveLength(2));
    await pick(user, edit, 1);
    await user.click(within(edit).getByRole('button', { name: '저장' }));
  };

  it('직원 수정: 바로 성공하면 수정과 그 아래 상세(옛 값)를 같이 닫는다', async () => {
    const { release, seen } = hold('patch', HRM_ENDPOINTS.EMPLOYEE_DETAIL(':employeeId'));
    const user = userEvent.setup();
    renderWithProviders(<EmployeesTab />);
    await openEmployeeEdit(user);
    await waitFor(() => expect(seen).toHaveBeenCalledOnce());
    release();
    await waitFor(() => expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0));
  });

  it('직원 수정: 늦게 성공해도 그 사이 연 등록 모달과 입력은 남는다', async () => {
    const { release, seen } = hold('patch', HRM_ENDPOINTS.EMPLOYEE_DETAIL(':employeeId'));
    const user = userEvent.setup();
    renderWithProviders(<EmployeesTab />);
    await openEmployeeEdit(user);
    await waitFor(() => expect(seen).toHaveBeenCalledOnce());

    await user.keyboard('{Escape}');
    await screen.findByRole('dialog', { name: '직원 상세보기' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '신규 직원 등록' }));
    const register = await screen.findByRole('dialog', { name: '신규 직원 등록' });
    const field = within(register).getAllByRole('textbox')[0];
    await user.type(field, '홍길동');

    release();
    expect(await screen.findByText('직원 정보가 수정되었습니다.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '신규 직원 등록' })).toBeInTheDocument();
    expect(field).toHaveValue('홍길동');
  });

  it('부서 수정: 늦게 성공해도 그 사이 연 상세는 남는다', async () => {
    const { release, seen } = hold('patch', HRM_ENDPOINTS.DEPARTMENTS_DETAIL(':departmentId'));
    const user = userEvent.setup();
    renderWithProviders(<DepartmentsTab />);
    await user.click((await screen.findAllByRole('button', { name: '상세' }))[0]);
    const detail = await screen.findByRole('dialog', { name: '부서 상세보기' });
    await user.click(within(detail).getByRole('button', { name: '수정' }));
    const edit = await screen.findByRole('dialog', { name: '부서정보 수정' });
    expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(1);
    await user.click(within(edit).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(seen).toHaveBeenCalledOnce());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: '상세' })[0]);
    await screen.findByRole('dialog', { name: '부서 상세보기' });
    release();
    expect(await screen.findByText('부서 정보가 수정되었습니다.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '부서 상세보기' })).toBeInTheDocument();
  });
});
