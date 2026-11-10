import axios from '@/lib/axiosInstance';
import {
  type AttendanceRecordsResponse,
  type EditUserRequest,
  type ProfileInfoResponse,
  type RequestVacation,
  type TodayAttendResponse,
  type TrainingResponse,
} from './ProfileType';
import { type ApiResponse, type ApiResponseNoData, PROFILE_ENDPOINTS } from '@/app/types/api';

export const postVacation = async (items: RequestVacation): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(PROFILE_ENDPOINTS.VACATION, items);
  return res.data;
};

export const postTraining = async (trainingId: string): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(PROFILE_ENDPOINTS.REGISTER_TRAINING(trainingId));
  return res.data;
};

export const patchCheckIn = async (): Promise<ApiResponseNoData> => {
  const res = await axios.patch<ApiResponseNoData>(PROFILE_ENDPOINTS.CHECK_IN);
  return res.data;
};

export const patchCheckout = async (): Promise<ApiResponseNoData> => {
  const res = await axios.patch<ApiResponseNoData>(PROFILE_ENDPOINTS.CHECK_OUT);
  return res.data;
};

export const getProfile = async (): Promise<ProfileInfoResponse> => {
  const res = await axios.get<ApiResponse<ProfileInfoResponse>>(PROFILE_ENDPOINTS.PROFILE_INFO);
  return res.data.data;
};

export const getTodayAttendance = async (): Promise<TodayAttendResponse> => {
  const res = await axios.get<ApiResponse<TodayAttendResponse>>(PROFILE_ENDPOINTS.TODAY_ATTENDANCE);
  return res.data.data;
};

export const getAttendaceRecords = async (): Promise<AttendanceRecordsResponse[]> => {
  const res = await axios.get<ApiResponse<AttendanceRecordsResponse[]>>(
    PROFILE_ENDPOINTS.ATTENDANCE_RECORDS,
  );
  return res.data.data;
};

export const getAvailableTraining = async (): Promise<TrainingResponse[]> => {
  const res = await axios.get<ApiResponse<TrainingResponse[]>>(
    PROFILE_ENDPOINTS.AVAILABLE_TRAINING,
  );
  return res.data.data;
};

export const getProgressTraining = async (): Promise<TrainingResponse[]> => {
  const res = await axios.get<ApiResponse<TrainingResponse[]>>(PROFILE_ENDPOINTS.PROGRESS_TRAINING);
  return res.data.data;
};
export const getCompletedTraining = async (): Promise<TrainingResponse[]> => {
  const res = await axios.get<ApiResponse<TrainingResponse[]>>(
    PROFILE_ENDPOINTS.COMPLETED_TRAINING,
  );
  return res.data.data;
};

export const postProfile = async (profileInfo: EditUserRequest): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(PROFILE_ENDPOINTS.EDIT_PROFILE, {
    phoneNumber: profileInfo.phoneNumber,
    address: profileInfo.address,
  });
  return res.data;
};
