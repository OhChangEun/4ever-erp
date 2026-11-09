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
 *
 * 낙관적 업데이트(optimistic)를 주면 규칙이 바뀐다. 응답 전에 캐시를 고치고, 실패하면 되돌리고,
 * 성공과 실패 모두 끝나면 무효화해서 낙관적 값을 서버 값으로 덮는다.
 * 결정 7: 낙관적 업데이트는 기존 항목의 상태나 필드를 바꾸는 mutation 에만. 생성에는 쓰지 않는다.
 */
export interface MutationCallbacks<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

/** 캐시 한 덩어리(prefix 가 같은 쿼리 전부)에 적용할 낙관적 변경 */
export interface OptimisticPatch {
  queryKey: QueryKey;
  apply: (queryClient: QueryClient) => void;
}

/**
 * 낙관적 변경 하나를 만든다. `setQueriesData` 는 prefix match 라 목록의 모든 페이지와 필터에 닿는다.
 * (`setQueryData` 는 exact match 라 `xxxKeys.lists()` 에 쓰면 실제 화면 쿼리에 안 닿는다. 10월에 죽어 있던 이유)
 * 캐시가 아직 없으면 건드리지 않는다.
 */
export const optimisticPatch = <TCache>(
  queryKey: QueryKey,
  update: (old: TCache) => TCache,
): OptimisticPatch => ({
  queryKey,
  apply: (queryClient) =>
    queryClient.setQueriesData<TCache>({ queryKey }, (old) =>
      old === undefined ? old : update(old),
    ),
});

export interface InvalidatingMutationOptions<TData, TVariables> {
  mutationKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  effects: (variables: TVariables) => readonly QueryKey[];
  callbacks?: MutationCallbacks<TData, TVariables>;
  /** 응답 전에 캐시에 미리 반영할 것. 기존 항목의 상태 변경에만 쓴다 */
  optimistic?: (variables: TVariables) => readonly OptimisticPatch[];
  /**
   * 같은 캐시를 고치는 낙관적 mutation 들이 공유하는 이름. 같은 이름끼리는 스냅샷부터 정산까지 한 줄로 선다.
   * 겹치면 두 번째 스냅샷에 첫 번째의 낙관적 값이 들어가, 둘 다 실패할 때 롤백이 실패한 값을 되살린다(리뷰 A1).
   * 기본값은 mutationKey 라 같은 훅끼리만 줄 선다. 다른 훅과 캐시를 나누면 같은 이름을 준다.
   */
  optimisticScope?: string;
}

export const invalidateAll = (queryClient: QueryClient, keys: readonly QueryKey[]) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

type Snapshot = ReadonlyArray<readonly [QueryKey, unknown]>;
interface OptimisticContext {
  snapshot: Snapshot;
  /** 줄에서 빠진다. 정산(onSettled) 때 부른다 */
  release: () => void;
}

/** QueryClient 마다, 범위 이름마다 마지막 낙관적 mutation 이 끝나는 시점 */
const scopeTails = new WeakMap<QueryClient, Map<string, Promise<void>>>();

/** 범위의 줄 끝에 선다. 앞사람이 끝나길 기다릴 promise 와, 내가 끝났다고 알릴 함수를 돌려준다 */
const joinScope = (queryClient: QueryClient, scope: string) => {
  const tails = scopeTails.get(queryClient) ?? new Map<string, Promise<void>>();
  scopeTails.set(queryClient, tails);
  const previous = tails.get(scope) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const mine = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => mine);
  tails.set(scope, tail);
  const leave = () => {
    release();
    // 내가 마지막이면 줄을 지운다(맵이 계속 커지지 않게)
    if (tails.get(scope) === tail) tails.delete(scope);
  };
  return { previous, leave };
};

const restore = (queryClient: QueryClient, snapshot: Snapshot) => {
  for (const [queryKey, data] of snapshot) queryClient.setQueryData(queryKey, data);
};

export function useInvalidatingMutation<TData, TVariables>({
  mutationKey,
  mutationFn,
  effects,
  callbacks = {},
  optimistic,
  optimisticScope,
}: InvalidatingMutationOptions<TData, TVariables>): UseMutationResult<
  TData,
  Error,
  TVariables,
  OptimisticContext | undefined
> {
  const queryClient = useQueryClient();
  // 중복 제출 안전망. 같은 훅의 요청이 진행 중이면 두 번째 mutate 는 버린다.
  // isPending 은 렌더 스냅샷이라 같은 틱의 더블 클릭을 못 막는다. ref 로 즉시 표시한다.
  const inFlight = useRef(false);
  const mutation = useMutation<TData, Error, TVariables, OptimisticContext | undefined>({
    mutationKey,
    mutationFn,
    onMutate: async (variables) => {
      if (!optimistic) return undefined;
      const { previous, leave } = joinScope(
        queryClient,
        optimisticScope ?? JSON.stringify(mutationKey),
      );
      try {
        // 같은 범위의 앞선 낙관적 mutation 이 정산될 때까지 기다린다. 그래야 스냅샷이 확정된 값이다
        await previous;
        const patches = optimistic(variables);
        // 진행 중인 refetch 가 낙관적 값을 옛 서버 값으로 덮지 않게 먼저 취소한다
        await Promise.all(patches.map(({ queryKey }) => queryClient.cancelQueries({ queryKey })));
        const snapshot = patches.flatMap(({ queryKey }) =>
          queryClient.getQueriesData({ queryKey }),
        );
        try {
          for (const patch of patches) patch.apply(queryClient);
        } catch (error) {
          // 캐시 모양이 예상과 달라 낙관적 반영이 실패해도 저장 요청은 보내야 한다(우선순위 1).
          // 반쯤 고친 캐시는 되돌리고, 끝나면 무효화가 서버 값으로 채운다.
          restore(queryClient, snapshot);
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[mutation] 낙관적 반영을 건너뛰었다:', mutationKey, error);
          }
        }
        return { snapshot, release: leave };
      } catch (error) {
        // 여기서 빠져나가면 onSettled 가 context 없이 불린다. 줄을 막지 않게 바로 빠진다
        leave();
        throw error;
      }
    },
    onSuccess: async (data, variables) => {
      // 낙관적 업데이트가 없으면 여기서 무효화한다. 있으면 onSettled 에서 한다.
      if (!optimistic) await invalidateAll(queryClient, effects(variables));
      callbacks.onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      // 낙관적 값 되돌리기. 스냅샷은 onMutate 가 고치기 전의 값이다.
      restore(queryClient, context?.snapshot ?? []);
      callbacks.onError?.(error, variables);
    },
    onSettled: async (_data, _error, variables, context) => {
      inFlight.current = false;
      if (!optimistic) return;
      try {
        await invalidateAll(queryClient, effects(variables));
      } finally {
        // 무효화를 건 뒤에 줄에서 빠진다. 다음 사람의 스냅샷은 롤백까지 끝난 캐시에서 뜬다
        context?.release();
      }
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
