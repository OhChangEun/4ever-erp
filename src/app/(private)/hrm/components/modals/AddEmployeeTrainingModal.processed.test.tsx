import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { error, ok } from '@/mocks/utils';
import { HRM_BASE_PATH } from '@/app/types/api';
import { HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { countRequests } from '@/test/countRequests';
import AddEmployeeTrainingModal from './AddEmployeeTrainingModal';

/**
 * 이미 처리된 건의 버튼 카드. 기본 목 직원(emp-001) 이력에는 안전 교육(prog-001)이 있고 모집 중인 산업 안전 보건(prog-010)은
 * 없다(카드 "데모 목록 인사 재무"의 교육 이력). 드롭다운은 그 둘로 좁혀서 본다.
 */
const usePrograms = () =>
  server.use(
    http.get(HRM_ENDPOINTS.PROGRAM_LIST_DROPDOWN, () =>
      ok([
        { key: 'prog-001', value: '안전 교육' },
        { key: 'prog-010', value: '산업 안전 보건' },
      ]),
    ),
  );

const openOptions = async () => {
  const combobox = await screen.findByRole('combobox', { name: '프로그램 선택' });
  await waitFor(() => expect(combobox).toBeEnabled());
  await userEvent.click(combobox);
  return screen.findByRole('listbox', { name: '프로그램 선택' });
};

describe('교육 지정: 이미 받은 프로그램은 고를 수 없다', () => {
  it('그 직원 이력에 있는 프로그램은 드롭다운에 없다', async () => {
    usePrograms();
    renderWithProviders(<AddEmployeeTrainingModal id="m" onClose={vi.fn()} employeeId="emp-001" />);
    await openOptions();
    expect(screen.getByRole('option', { name: '산업 안전 보건' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '안전 교육' })).not.toBeInTheDocument();
  });

  it('지정 뒤 다시 열면 그 프로그램을 고를 수 없고 두 번째 요청이 없다', async () => {
    usePrograms();
    const posts = countRequests('POST', `${HRM_BASE_PATH}/program/emp-001`);
    const onClose = vi.fn();
    const user = userEvent.setup();
    const modal = <AddEmployeeTrainingModal id="m" onClose={onClose} employeeId="emp-001" />;
    const { rerender } = renderWithProviders(modal);

    await openOptions();
    await user.click(screen.getByRole('option', { name: '산업 안전 보건' }));
    await user.click(screen.getByRole('button', { name: '추가' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    // 같은 QueryClient 에서 모달을 닫았다 다시 연다
    rerender(<div />);
    rerender(modal);
    await openOptions();
    expect(screen.queryByRole('option', { name: '산업 안전 보건' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: '추가' }));
    expect(await screen.findByText('교육 프로그램을 선택해주세요.')).toBeInTheDocument();
    expect(posts()).toBe(1);
  });

  it('이력을 못 받으면 고를 수 없고 실패를 보인다', async () => {
    usePrograms();
    server.use(
      http.get(`${HRM_BASE_PATH}/training/employee/:employeeId`, () =>
        error('Failed to load training detail', 500),
      ),
    );
    renderWithProviders(<AddEmployeeTrainingModal id="m" onClose={vi.fn()} employeeId="emp-001" />);
    expect(await screen.findByText('데이터를 불러올 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '프로그램 선택' })).toBeDisabled();
  });
});

describe('교육 지정 리뷰 반영', () => {
  const historyFails = () =>
    server.use(
      http.get(`${HRM_BASE_PATH}/training/employee/:employeeId`, () =>
        error('Failed to load training detail', 500),
      ),
    );

  it('이력을 다시 못 받으면 캐시된 옛 이력이 있어도 고를 수 없고 제출이 잠긴다', async () => {
    usePrograms();
    const { queryClient } = renderWithProviders(
      <AddEmployeeTrainingModal id="m" onClose={vi.fn()} employeeId="emp-001" />,
    );
    await openOptions();
    await userEvent.keyboard('{Escape}');

    historyFails();
    await act(() => queryClient.invalidateQueries());

    expect(await screen.findByText('데이터를 불러올 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '프로그램 선택' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled();
  });

  it('이력 조회 실패 문구 옆 다시 시도로 다시 받으면 고를 수 있다', async () => {
    usePrograms();
    historyFails();
    renderWithProviders(<AddEmployeeTrainingModal id="m" onClose={vi.fn()} employeeId="emp-001" />);
    const retry = await screen.findByRole('button', { name: '다시 시도' });

    server.resetHandlers();
    usePrograms();
    await userEvent.click(retry);

    await openOptions();
    expect(screen.getByRole('option', { name: '산업 안전 보건' })).toBeInTheDocument();
    expect(screen.queryByText('데이터를 불러올 수 없습니다.')).not.toBeInTheDocument();
  });
});
