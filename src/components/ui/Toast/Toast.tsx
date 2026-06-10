import { useEffect } from 'react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  children: React.ReactNode;
  tone: ToastTone;
  onDismiss?: () => void;
  duration?: number;
}

const toneClasses: Record<ToastTone, string> = {
  success: 'bg-success-bg text-success-text border-l-success-text',
  error: 'bg-danger-bg text-danger-text border-l-danger-text',
  warning: 'bg-amber-500/15 text-amber-700 border-l-amber-500',
  info: 'bg-blue-500/10 text-blue-700 border-l-blue-500',
};

export function Toast({ children, tone, onDismiss, duration = 0 }: ToastProps) {
  useEffect(() => {
    if (duration <= 0 || !onDismiss) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm border-l-4 ${toneClasses[tone]}`} role="alert">
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button className="inline-flex items-center justify-center w-6 h-6 border-none bg-transparent cursor-pointer text-inherit opacity-60 hover:opacity-100 text-base p-0 shrink-0" onClick={onDismiss} aria-label="Dismiss" type="button">
          ×
        </button>
      )}
    </div>
  );
}
