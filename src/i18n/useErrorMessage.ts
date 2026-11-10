'use client';

import { useTranslations } from 'next-intl';
import { isAppError } from '@/lib/AppError';

/** 화면에는 오류 종류별 안내만 번역해 표시한다. */
export const useErrorMessage = () => {
  const t = useTranslations('errors');
  return (error: unknown): string => (isAppError(error) ? t(error.kind) : t('unknown'));
};

/** 오류 상자에서 서버 로그를 찾을 수 있도록 요청 ID 앞 8자에 번역된 이름을 붙인다. */
export const useRequestIdLabel = (error: unknown): string | null => {
  const t = useTranslations('errors');
  return isAppError(error) && error.requestId
    ? t('requestId', { requestId: error.requestId.slice(0, 8) })
    : null;
};
