'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { type ToastItem, type ToastType } from '@/app/components/common/toast/types';
import { useIsClient } from '@/app/hooks/useMediaQuery';

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToastContext = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext는 ToastProvider 안에서 사용되어야 합니다.');
  return ctx;
};

const ICONS: Record<ToastType, string> = {
  success: 'ri-checkbox-circle-fill',
  error: 'ri-error-warning-fill',
  warning: 'ri-alert-fill',
  info: 'ri-information-fill',
};

const STYLES: Record<ToastType, { wrap: string; icon: string; text: string }> = {
  success: {
    wrap: 'bg-green-100 border-green-300',
    icon: 'text-green-500',
    text: 'text-green-800',
  },
  error: {
    wrap: 'bg-red-100 border-red-300',
    icon: 'text-red-500',
    text: 'text-red-800',
  },
  warning: {
    wrap: 'bg-amber-100 border-amber-300',
    icon: 'text-amber-500',
    text: 'text-amber-800',
  },
  info: {
    wrap: 'bg-blue-100 border-blue-300',
    icon: 'text-blue-500',
    text: 'text-blue-800',
  },
};

/** 사라지는 애니메이션 길이(--animate-toast-out 과 같게) */
const LEAVE_MS = 200;

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000,
};

function ToastItemComponent({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const s = STYLES[toast.type];
  // 사라지는 중. CSS 애니메이션(200ms) 동안 DOM 에 남겼다가 지운다
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onRemove(toast.id), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving, toast.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-3 w-80 px-4 py-3 rounded-xl border shadow-lg ${s.wrap} ${
        leaving ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <i aria-hidden="true" className={`${ICONS[toast.type]} ${s.icon} text-lg mt-0.5 shrink-0`} />
      <p className={`text-sm leading-snug flex-1 ${s.text}`}>{toast.message}</p>
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={() => setLeaving(true)}
        className={`${s.icon} opacity-60 hover:opacity-100 cursor-pointer shrink-0 leading-none`}
      >
        <i aria-hidden="true" className="ri-close-line text-base" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // 포털은 document 가 있어야 한다. 서버 렌더와 첫 하이드레이션은 false
  const mounted = useIsClient();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [
      ...prev,
      { id, type, message, duration: duration ?? DEFAULT_DURATION[type] },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {mounted &&
        createPortal(
          // 알림 영역. 새 토스트를 스크린리더가 읽는다(polite: 하던 말을 끊지 않음)
          <div
            role="status"
            aria-live="polite"
            className="fixed top-6 left-1/2 -translate-x-1/2 z-toast flex flex-col gap-2 pointer-events-none items-center"
          >
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <ToastItemComponent toast={toast} onRemove={removeToast} />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
