import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { createTestQueryClient } from '@/test/render';
import { scenarioResponse } from '@/mocks/scenario';
import type { ProfileInfoResponse } from './ProfileType';
import { expectMatrix } from '@/test/mutationMatrix';
import { profileKeys } from './profile.keys';
import { attendanceKeys, leaveKeys, trainingKeys } from '@/app/(private)/hrm/api/hrm.keys';
import {
  useCheckIn,
  useCheckOut,
  useEditProfile,
  useRegisterTraining,
  useRequestVacation,
} from './profile.mutations';

const FOREIGN = ['purchase', 'orders', 'list'];
const LEAVE_LIST = leaveKeys.list({ page: 0, size: 10 });
const ATTENDANCE_LIST = attendanceKeys.list({ page: 0, size: 10, date: '2026-11-09' });
const ATTENDANCE_SUMMARY = attendanceKeys.summary();
const TRAINING_LIST = trainingKeys.list({ page: 0, size: 10 });

describe('프로필 셀프서비스 mutation 훅', () => {
  it('휴가 신청 → 내 근태 기록 + 인사 휴가 목록(교차)', () =>
    expectMatrix({
      name: '',
      useHook: useRequestVacation,
      variables: { leaveType: 'ANNUAL', startDate: '2026-11-10', endDate: '2026-11-11' },
      invalidates: [profileKeys.attendanceRecords(), LEAVE_LIST],
      keeps: [profileKeys.info(), TRAINING_LIST, FOREIGN],
    }));

  it('출근 → 오늘 근태, 근태 기록 + 인사 근태 목록(교차)', () =>
    expectMatrix({
      name: '',
      useHook: useCheckIn,
      variables: undefined,
      invalidates: [
        profileKeys.todayAttendance(),
        profileKeys.attendanceRecords(),
        ATTENDANCE_LIST,
        ATTENDANCE_SUMMARY,
      ],
      keeps: [profileKeys.info(), LEAVE_LIST, FOREIGN],
    }));

  it('퇴근 → 오늘 근태, 근태 기록 + 인사 근태 목록(교차)', () =>
    expectMatrix({
      name: '',
      useHook: useCheckOut,
      variables: undefined,
      invalidates: [
        profileKeys.todayAttendance(),
        profileKeys.attendanceRecords(),
        ATTENDANCE_LIST,
        ATTENDANCE_SUMMARY,
      ],
      keeps: [profileKeys.info(), LEAVE_LIST, FOREIGN],
    }));

  it('교육 신청 → 내 교육 탭 전부 + 인사 교육 이력(교차)', () =>
    expectMatrix({
      name: '',
      useHook: useRegisterTraining,
      variables: 'tr-1',
      invalidates: [
        profileKeys.training('available'),
        profileKeys.training('progress'),
        TRAINING_LIST,
      ],
      keeps: [profileKeys.info(), FOREIGN],
    }));
});

describe('프로필 수정 낙관적 업데이트', () => {
  const info: ProfileInfoResponse = {
    name: '홍길동',
    employeeNumber: 'EMP-1',
    department: '영업팀',
    position: '팀장',
    hireDate: '2022-03-01',
    serviceYears: '3',
    email: 'old@everp.local',
    phoneNumber: '010-1111-1111',
    address: '서울',
  };
  const setup = () => {
    const qc = createTestQueryClient();
    qc.setQueryData(profileKeys.info(), info);
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return { qc, Wrapper };
  };

  it('입력값을 즉시 병합하고 끝나면 무효화한다', async () => {
    const { qc, Wrapper } = setup();
    const { result } = renderHook(() => useEditProfile(), { wrapper: Wrapper });
    act(() => result.current.mutate({ phoneNumber: '010-2222-2222', address: '부산' }));
    await waitFor(() =>
      expect(qc.getQueryData<ProfileInfoResponse>(profileKeys.info())?.address).toBe('부산'),
    );
    expect(qc.getQueryData<ProfileInfoResponse>(profileKeys.info())?.name).toBe('홍길동');
    await waitFor(() => expect(qc.getQueryState(profileKeys.info())?.isInvalidated).toBe(true));
  });

  it('500 이면 되돌린다', async () => {
    server.use(http.all('*', () => scenarioResponse('500')));
    const { qc, Wrapper } = setup();
    const { result } = renderHook(() => useEditProfile(), { wrapper: Wrapper });
    act(() => result.current.mutate({ phoneNumber: '010-2222-2222', address: '부산' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(qc.getQueryData<ProfileInfoResponse>(profileKeys.info())?.address).toBe('서울');
  });
});
