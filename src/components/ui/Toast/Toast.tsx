import { useEffect } from 'react';
import styles from './Toast.module.css';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  children: React.ReactNode;
  tone: ToastTone;
  onDismiss?: () => void;
  duration?: number;
}

export function Toast({ children, tone, onDismiss, duration = 0 }: ToastProps) {
  useEffect(() => {
    if (duration <= 0 || !onDismiss) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className={[styles.toast, styles[tone]].join(' ')} role="alert">
      <span className={styles.body}>{children}</span>
      {onDismiss && (
        <button className={styles.close} onClick={onDismiss} aria-label="Dismiss" type="button">
          ×
        </button>
      )}
    </div>
  );
}
