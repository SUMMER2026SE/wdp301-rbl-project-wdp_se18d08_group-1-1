import { useCallback } from 'react';
import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export const useToast = () => {
  const showToast = useCallback((options: ToastOptions) => {
    Toast.show({
      type: options.type,
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 3000,
      position: 'top',
    });
  }, []);

  return {
    showToast,
    showSuccess: (title: string, message?: string) => showToast({ type: 'success', title, message }),
    showError: (title: string, message?: string) => showToast({ type: 'error', title, message }),
    showInfo: (title: string, message?: string) => showToast({ type: 'info', title, message }),
    showWarning: (title: string, message?: string) => showToast({ type: 'warning', title, message }),
  };
};
