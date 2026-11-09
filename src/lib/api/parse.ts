import type { AxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import axios from '@/lib/axiosInstance';
import { AppError } from '@/lib/AppError';
import type { ApiResponse } from '@/app/types/api';

/**
 * 응답 data 를 스키마로 확인한다. 틀리면 invalidShape AppError 로 올려 화면이 "형식 오류"를 보인다.
 * 빈 목록이나 0 으로 바꿔 숨기지 않는다(우선순위 2). 메시지에 첫 번째로 틀린 필드 경로를 적는다.
 */
export const parseData = <T>(schema: z.ZodType<T>, value: unknown, where: string): T => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues.at(0);
  const path = issue && issue.path.length > 0 ? issue.path.join('.') : '(전체)';
  throw new AppError('invalidShape', `${where} 응답의 ${path}: ${issue?.message ?? '형식 오류'}`, {
    cause: result.error,
  });
};

/** GET 한 뒤 래퍼의 data 를 스키마로 확인해 돌려준다. 래퍼 자체는 axios 인터셉터가 이미 봤다 */
export const getParsed = async <T>(
  schema: z.ZodType<T>,
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const res = await axios.get<ApiResponse<unknown>>(url, config);
  return parseData(schema, res.data.data, url);
};
