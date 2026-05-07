import { useQuery } from '@tanstack/react-query';
import { KeyValueItem } from '@/app/types/CommonType';
import { useMemo } from 'react';

type AllOptionMode = 'with-all' | 'without-all' | 'as-is';

const ALL_OPTION: KeyValueItem = { key: '', value: '전체' };

export const useDropdown = (
  key: string,
  fetchFn: () => Promise<KeyValueItem[]>,
  mode: AllOptionMode = 'as-is',
) => {
  const { data, isLoading, isError } = useQuery<KeyValueItem[]>({
    queryKey: [key],
    queryFn: fetchFn,
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
      default:
        return data;
    }
  }, [data, mode]);

  return { options, isLoading, isError };
};
