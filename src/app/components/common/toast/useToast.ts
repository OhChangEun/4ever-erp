import { useToastContext } from '@/app/components/common/toast/ToastProvider';

export const useToast = () => {
  const { addToast } = useToastContext();

  return {
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration),
    warning: (message: string, duration?: number) => addToast('warning', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
  };
};
