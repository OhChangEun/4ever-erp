import { useQuery } from '@tanstack/react-query';
import type { KeyValueItem } from '@/app/types/CommonType';
import type { OptionResponse } from '@/app/types/api';
import { toKeyValueItems } from '@/lib/api/options';
import { useMemo } from 'react';
import { dropdownKeys } from '@/app/hooks/dropdown.keys';

type AllOptionMode = 'with-all' | 'without-all' | 'as-is';

const ALL_OPTION: KeyValueItem = { key: '', value: '전체' };

export const useDropdown = (
  key: string,
  fetchFn: () => Promise<OptionResponse[]>,
  mode: AllOptionMode = 'as-is',
) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: dropdownKeys.options(key),
    queryFn: fetchFn,
    select: toKeyValueItems, // 응답(OptionResponse) → 화면 옵션(KeyValueItem)
    staleTime: Infinity,
  });

  const options = useMemo(() => {
    if (!data) return [];

    switch (mode) {
      case 'with-all':
        const hasAll = data.some((item) => item.value === ALL_OPTION.value);
        return hasAll ? data : [ALL_OPTION, ...data];
      case 'without-all':
        return data.filter((item) => item.value !== ALL_OPTION.value);
      case 'as-is':
        return data;
    }
  }, [data, mode]);

  return { options, isLoading, isError };
};
