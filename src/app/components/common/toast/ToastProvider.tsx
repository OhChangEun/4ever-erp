'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastItem, ToastType } from '@/app/components/common/toast/types';

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

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 w-80 px-4 py-3 rounded-xl border shadow-lg ${s.wrap}`}
    >
      <i className={`${ICONS[toast.type]} ${s.icon} text-lg mt-0.5 shrink-0`} />
      <p className={`text-sm leading-snug flex-1 ${s.text}`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`${s.icon} opacity-60 hover:opacity-100 cursor-pointer shrink-0 leading-none`}
      >
        <i className="ri-close-line text-base" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-toast flex flex-col gap-2 pointer-events-none items-center">
            <AnimatePresence initial={false}>
              {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                  <ToastItemComponent toast={toast} onRemove={removeToast} />
                </div>
              ))}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
