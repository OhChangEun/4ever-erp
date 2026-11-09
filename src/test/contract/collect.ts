/**
 * 계약 확인을 한 번에 다 돌리고 실패 메시지를 모은다. 첫 실패에서 멈추면 불일치를 하나씩만 보게 된다.
 * 앞 호출의 결과(목록의 첫 ID)가 필요한 확인은 함수 안에서 이어 부른다.
 */
export const collectFailures = async (
  checks: Record<string, () => Promise<unknown>>,
): Promise<string[]> => {
  const entries = Object.entries(checks);
  const results = await Promise.allSettled(entries.map(([, run]) => run()));
  return results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          `${entries[index][0]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        ]
      : [],
  );
};
