import { useQuery } from '@tanstack/react-query';
import type { KeyValueItem } from '@/app/types/CommonType';
import type { OptionResponse } from '@/app/types/api';
import { toKeyValueItems } from '@/lib/api/options';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { dropdownKeys } from '@/app/hooks/dropdown.keys';

type AllOptionMode = 'with-all' | 'without-all' | 'as-is';

/**
 * 서버가 옵션 목록에 넣어 보내는 '전체' 항목의 글자. 서버 데이터와 견주는 값이라 번역하지 않는다.
 * 화면이 덧붙이는 '전체' 항목의 글자는 메시지의 common.all 이다(값 key 는 '' 그대로 서버로 간다).
 */
const SERVER_ALL_VALUE = '전체';

export const useDropdown = (
  key: string,
  fetchFn: () => Promise<OptionResponse[]>,
  mode: AllOptionMode = 'as-is',
) => {
  const t = useTranslations('common');
  const allLabel = t('all');
  const { data, isLoading, isError } = useQuery({
    queryKey: dropdownKeys.options(key),
    queryFn: fetchFn,
    select: toKeyValueItems, // 응답(OptionResponse) → 화면 옵션(KeyValueItem)
    staleTime: Infinity,
  });

  const options = useMemo<KeyValueItem[]>(() => {
    if (!data) return [];

    switch (mode) {
      case 'with-all':
        const hasAll = data.some((item) => item.value === SERVER_ALL_VALUE);
        return hasAll ? data : [{ key: '', value: allLabel }, ...data];
      case 'without-all':
        return data.filter((item) => item.value !== SERVER_ALL_VALUE);
      case 'as-is':
        return data;
    }
  }, [data, mode, allLabel]);

  return { options, isLoading, isError };
};
