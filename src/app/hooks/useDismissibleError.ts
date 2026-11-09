import { useState } from 'react';

/**
 * 조회 오류 창의 열림 상태. 오류가 나면 열리고, 사용자가 닫으면 닫히고,
 * 오류 상태가 바뀌면(풀렸다가 다시 나거나, 다른 조회가 새로 실패하면) 다시 열린다.
 * 조회가 여럿이면 각각의 isError 를 넘긴다. OR 로 묶어 넘기면 두 번째 실패를 놓친다(리뷰 A1).
 *
 * 예전엔 모달마다 `useEffect(() => setErrorModal(isError), [isError])` 로 복사했다(R02, 13곳).
 * 여기선 effect 대신 "이전 값과 다르면 렌더 중에 state 를 맞추는" React 권장 방식으로 처리한다.
 */
export function useDismissibleError(...errors: boolean[]) {
  const signature = errors.map((isError) => (isError ? '1' : '0')).join('');
  const [dismissed, setDismissed] = useState(false);
  const [previousSignature, setPreviousSignature] = useState(signature);

  if (previousSignature !== signature) {
    setPreviousSignature(signature);
    setDismissed(false);
  }

  return {
    isOpen: errors.some(Boolean) && !dismissed,
    dismiss: () => setDismissed(true),
  };
}
