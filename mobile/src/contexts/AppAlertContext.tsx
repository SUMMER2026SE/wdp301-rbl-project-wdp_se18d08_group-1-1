import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import {
  BookingActionModal,
  type BookingModalVariant,
} from '@/components/booking/BookingActionModal';

export interface AppAlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

interface AlertRequest {
  title: string;
  message: string;
  buttons: AppAlertButton[];
}

interface AppAlertContextValue {
  alert: (title: string, message?: string, buttons?: AppAlertButton[]) => void;
}

const AppAlertContext = createContext<AppAlertContextValue | undefined>(undefined);

const inferVariant = (request: AlertRequest, primary: AppAlertButton): BookingModalVariant => {
  const normalizedTitle = request.title.toLocaleLowerCase('en-US');
  if (primary.style === 'destructive' || normalizedTitle.includes('error') || normalizedTitle.includes('failed')) return 'error';
  if (normalizedTitle.includes('missing') || normalizedTitle.includes('warning')) return 'warning';
  return 'info';
};

export const AppAlertProvider = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  const alert = useCallback((title: string, message = '', buttons?: AppAlertButton[]) => {
    setRequest({
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'Close' }],
    });
  }, []);

  const runButton = (button?: AppAlertButton) => {
    setRequest(null);
    if (button?.onPress) void button.onPress();
  };

  const value = useMemo<AppAlertContextValue>(() => ({ alert }), [alert]);
  const primary = request
    ? request.buttons.find((button) => button.style === 'destructive') ??
      [...request.buttons].reverse().find((button) => button.style !== 'cancel') ??
      request.buttons[0]
    : undefined;
  const secondary = request?.buttons.find((button) => button !== primary && button.style === 'cancel') ??
    request?.buttons.find((button) => button !== primary);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <BookingActionModal
        destructive={primary?.style === 'destructive'}
        message={request?.message}
        primaryLabel={primary?.text ?? 'Close'}
        secondaryLabel={secondary?.text}
        title={request?.title ?? ''}
        variant={request && primary ? inferVariant(request, primary) : 'info'}
        visible={Boolean(request)}
        onClose={() => runButton(secondary)}
        onPrimary={() => runButton(primary)}
        onSecondary={() => runButton(secondary)}
      />
    </AppAlertContext.Provider>
  );
};

export const useAppAlert = () => {
  const context = useContext(AppAlertContext);
  if (!context) throw new Error('useAppAlert must be used within AppAlertProvider.');
  return context;
};
