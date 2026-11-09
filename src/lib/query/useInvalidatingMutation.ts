import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query';

/**
 * 도메인 mutation 훅의 공통 모양. 성공하면 `effects(variables)` 가 돌려준 키를 전부 무효화한 뒤
 * 컴포넌트가 준 onSuccess 를 부른다. 실패면 서버가 안 바뀌었으니 무효화하지 않는다.
 * 도메인별 `*_MUTATION_EFFECTS` 표가 effects 의 출처다. 토스트, confirm, 모달 닫기는 컴포넌트 몫.
 */
export interface MutationCallbacks<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export interface InvalidatingMutationOptions<TData, TVariables> {
  mutationKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  effects: (variables: TVariables) => readonly QueryKey[];
  callbacks?: MutationCallbacks<TData, TVariables>;
}

export const invalidateAll = (queryClient: QueryClient, keys: readonly QueryKey[]) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export function useInvalidatingMutation<TData, TVariables>({
  mutationKey,
  mutationFn,
  effects,
  callbacks = {},
}: InvalidatingMutationOptions<TData, TVariables>): UseMutationResult<TData, Error, TVariables> {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationKey,
    mutationFn,
    onSuccess: async (data, variables) => {
      await invalidateAll(queryClient, effects(variables));
      callbacks.onSuccess?.(data, variables);
    },
    onError: (error, variables) => callbacks.onError?.(error, variables),
  });
}
