import type { QueryKey } from '@tanstack/react-query';
import {
  optimisticPatch,
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import {
  patchCheckIn,
  patchCheckout,
  postProfile,
  postTraining,
  postVacation,
} from './profile.api';
import { profileKeys } from './profile.keys';
import { attendanceKeys, leaveKeys, trainingKeys } from '@/app/(private)/hrm/api/hrm.keys';
import type { EditUserRequest, ProfileInfoResponse, RequestVacation } from './ProfileType';
import type { ApiResponseNoData } from '@/app/types/api';

/**
 * 프로필 셀프서비스 mutation → 다시 가져올 쿼리 키. 이 표가 동작이다.
 * 내 근태와 휴가, 교육은 인사 관리자 화면의 목록에도 나타나므로 인사 키를 의도적으로 교차 무효화한다.
 */
export const PROFILE_MUTATION_EFFECTS = {
  editProfile: (): readonly QueryKey[] => [profileKeys.info()],
  requestVacation: (): readonly QueryKey[] => [profileKeys.attendanceRecords(), leaveKeys.lists()],
  checkIn: (): readonly QueryKey[] => [
    profileKeys.todayAttendance(),
    profileKeys.attendanceRecords(),
    attendanceKeys.lists(),
    attendanceKeys.summary(),
  ],
  checkOut: (): readonly QueryKey[] => [
    profileKeys.todayAttendance(),
    profileKeys.attendanceRecords(),
    attendanceKeys.lists(),
    attendanceKeys.summary(),
  ],
  registerTraining: (): readonly QueryKey[] => [profileKeys.trainings(), trainingKeys.lists()],
} as const;

export type ProfileMutationName = keyof typeof PROFILE_MUTATION_EFFECTS;
export const profileMutationKey = (name: ProfileMutationName) =>
  ['profile', 'mutation', name] as const;

export const useRequestVacation = (
  callbacks?: MutationCallbacks<ApiResponseNoData, RequestVacation>,
) =>
  useInvalidatingMutation<ApiResponseNoData, RequestVacation>({
    mutationKey: profileMutationKey('requestVacation'),
    mutationFn: (body) => postVacation(body),
    effects: () => PROFILE_MUTATION_EFFECTS.requestVacation(),
    callbacks,
  });

export const useCheckIn = (callbacks?: MutationCallbacks<ApiResponseNoData, void>) =>
  useInvalidatingMutation<ApiResponseNoData, void>({
    mutationKey: profileMutationKey('checkIn'),
    mutationFn: () => patchCheckIn(),
    effects: () => PROFILE_MUTATION_EFFECTS.checkIn(),
    callbacks,
  });

export const useCheckOut = (callbacks?: MutationCallbacks<ApiResponseNoData, void>) =>
  useInvalidatingMutation<ApiResponseNoData, void>({
    mutationKey: profileMutationKey('checkOut'),
    mutationFn: () => patchCheckout(),
    effects: () => PROFILE_MUTATION_EFFECTS.checkOut(),
    callbacks,
  });

export const useRegisterTraining = (callbacks?: MutationCallbacks<ApiResponseNoData, string>) =>
  useInvalidatingMutation<ApiResponseNoData, string>({
    mutationKey: profileMutationKey('registerTraining'),
    mutationFn: (trainingId) => postTraining(trainingId),
    effects: () => PROFILE_MUTATION_EFFECTS.registerTraining(),
    callbacks,
  });

/** 프로필 수정. 입력값을 내 정보 캐시에 바로 병합한다(같은 화면 머리말이 즉시 바뀐다) */
export const useEditProfile = (callbacks?: MutationCallbacks<ApiResponseNoData, EditUserRequest>) =>
  useInvalidatingMutation<ApiResponseNoData, EditUserRequest>({
    mutationKey: profileMutationKey('editProfile'),
    mutationFn: (body) => postProfile(body),
    effects: () => PROFILE_MUTATION_EFFECTS.editProfile(),
    optimistic: (body) => [
      optimisticPatch<ProfileInfoResponse>(profileKeys.info(), (old) => ({ ...old, ...body })),
    ],
    callbacks,
  });
