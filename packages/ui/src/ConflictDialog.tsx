'use client';

import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { useUiText } from './UiText';

interface ConflictDialogProps {
  /** 무엇이 충돌했는지. "다른 사용자가 이미 이 {subject}을 수정했습니다" */
  subject: string;
  onClose: () => void;
  onReload: () => void;
}

/**
 * 409(다른 사용자가 먼저 수정) 안내. 공통 빌더가 이미 영향 키를 다시 가져오고 있으므로
 * "최신 데이터 불러오기"는 화면을 확실히 새 값으로 돌리고 닫는 동작이다.
 * 부모의 relative 영역 위에 덮는다(모달 안에서 쓰는 용도).
 * aria-modal 이 약속하는 키보드 동작을 지킨다. 열리면 "최신 데이터 불러오기"로 포커스,
 * Tab 은 안에서만 돌고, Esc 는 닫기, 닫히면 열기 전 포커스로 돌아간다(리뷰 A1).
 */
export default function ConflictDialog({ subject, onClose, onReload }: ConflictDialogProps) {
  const ui = useUiText();
  const text = ui.conflict;
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    reloadRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll('button') ?? []);
    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="absolute inset-0 z-overlay flex items-center justify-center bg-black/40 rounded-lg">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <i aria-hidden="true" className="ri-error-warning-line text-yellow-600 text-xl"></i>
          </div>
          <div>
            <p id={titleId} className="font-semibold text-gray-900">
              {text.title}
            </p>
            <p id={descriptionId} className="text-sm text-gray-500 mt-0.5">
              {text.description(subject)}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{text.hint}</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            {ui.close}
          </button>
          <button
            ref={reloadRef}
            type="button"
            onClick={onReload}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            {text.reload}
          </button>
        </div>
      </div>
    </div>
  );
}
