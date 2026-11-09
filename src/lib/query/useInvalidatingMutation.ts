import { useCallback, useRef } from 'react';
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
  // 중복 제출 안전망. 같은 훅의 요청이 진행 중이면 두 번째 mutate 는 버린다.
  // isPending 은 렌더 스냅샷이라 같은 틱의 더블 클릭을 못 막는다. ref 로 즉시 표시한다.
  const inFlight = useRef(false);
  const mutation = useMutation<TData, Error, TVariables>({
    mutationKey,
    mutationFn,
    onSuccess: async (data, variables) => {
      await invalidateAll(queryClient, effects(variables));
      callbacks.onSuccess?.(data, variables);
    },
    onError: (error, variables) => callbacks.onError?.(error, variables),
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const { mutate: rawMutate } = mutation;
  const mutate = useCallback<typeof rawMutate>(
    (...args) => {
      if (inFlight.current) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[mutation] 진행 중인 요청이 있어 중복 호출을 버렸다:', mutationKey);
        }
        return;
      }
      inFlight.current = true;
      rawMutate(...args);
    },
    // mutationKey 는 경고 문구용. 배열 리터럴이 매 렌더 바뀌어도 동작엔 영향 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawMutate],
  );

  // mutateAsync 는 그대로 둔다. 순차 호출과 테스트가 쓴다. 화면 버튼은 mutate 를 쓴다.
  return { ...mutation, mutate };
}
