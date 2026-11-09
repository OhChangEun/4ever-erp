import { useEffect } from 'react';

/**
 * 열려 있는 동안 Esc 로 닫는다. 드롭다운류 팝업용(접근성 2 리뷰 P2).
 * 모달 안에서 팝업이 열려 있으면 모달 틀이 Esc 를 넘겨주므로, 팝업이 직접 받아 닫아야 한다.
 */
export function useCloseOnEscape(open: boolean, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);
}
