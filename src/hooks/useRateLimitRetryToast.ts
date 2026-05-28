import { useCallback, useEffect, useRef } from 'react';
import { useDialog } from '../contexts/DialogContext';
import type { Retry429Options } from '../lib/networkSafety';

export function useRateLimitRetryToast(message: string) {
  const dialog = useDialog();
  const messageRef = useRef(message);
  const showToastRef = useRef(dialog.showToast);
  const hasShownRef = useRef(false);

  useEffect(() => {
    messageRef.current = message;
    showToastRef.current = dialog.showToast;
  }, [dialog.showToast, message]);

  const onRetry = useCallback<NonNullable<Retry429Options['onRetry']>>(() => {
    if (hasShownRef.current) return;
    hasShownRef.current = true;
    showToastRef.current(messageRef.current);
  }, []);

  const reset = useCallback(() => {
    hasShownRef.current = false;
  }, []);

  return { onRetry, reset };
}
