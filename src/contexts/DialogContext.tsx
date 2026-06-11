import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { BaseModal } from '../components/common/BaseModal';

type DialogVariant = 'info' | 'danger' | 'warning';

interface MessageOptions {
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  variant?: DialogVariant;
}

interface ConfirmOptions extends MessageOptions {
  cancelLabel?: string;
}

interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}

interface DialogContextValue {
  showMessage: (options: MessageOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  showToast: (message: string, duration?: number) => void;
}

type ActiveDialog =
  | { type: 'message'; options: MessageOptions; resolve: () => void }
  | { type: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { type: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

export const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  const closeDialog = useCallback((value: boolean | string | null) => {
    setActiveDialog((current) => {
      if (!current) {
        return null;
      }

      if (current.type === 'message') {
        current.resolve();
      } else if (current.type === 'confirm') {
        current.resolve(value === true);
      } else {
        current.resolve(typeof value === 'boolean' ? (value ? promptValue : null) : value);
      }

      return null;
    });
    setPromptValue('');
  }, [promptValue]);

  const showMessage = useCallback((options: MessageOptions) => {
    return new Promise<void>((resolve) => {
      setActiveDialog({
        type: 'message',
        options,
        resolve: () => resolve(),
      });
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setActiveDialog({
        type: 'confirm',
        options,
        resolve,
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue('');
      setActiveDialog({
        type: 'prompt',
        options,
        resolve,
      });
    });
  }, []);

  const showToast = useCallback((message: string, duration = 3000) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, duration);
  }, []);

  const value = useMemo(() => ({ showMessage, confirm, prompt, showToast }), [showMessage, confirm, prompt, showToast]);
  const variant = activeDialog?.options.variant || 'info';

  return (
    <DialogContext.Provider value={value}>
      {children}

      {toast && (
        <div
          key={toast.id}
          className="pointer-events-none fixed right-6 bottom-6 z-[9999] flex animate-toast-slide-in items-center gap-2 rounded-lg border border-white/10 bg-[var(--text-color,#1f2937)] px-5 py-3 text-xs font-medium text-white shadow-lg backdrop-blur"
        >
          <span className="text-sm">ℹ️</span>
          <span>{toast.message}</span>
        </div>
      )}

      <BaseModal
        isOpen={Boolean(activeDialog)}
        onClose={() => closeDialog(null)}
        title={activeDialog?.options.title || ''}
        maxWidth="440px"
        footer={
          activeDialog && (
            <>
              {(activeDialog.type === 'confirm' || activeDialog.type === 'prompt') && (
                <button className="btn btn-ghost" onClick={() => closeDialog(null)}>
                  {activeDialog.options.cancelLabel || 'Cancel'}
                </button>
              )}
              <button
                className={`btn ${
                  variant === 'danger' ? 'btn-danger' :
                  variant === 'warning' ? 'btn-secondary' :
                  'btn-primary'
                }`}
                disabled={activeDialog.type === 'prompt' && activeDialog.options.required && !promptValue.trim()}
                onClick={() => closeDialog(true)}
              >
                {activeDialog.options.confirmLabel || (activeDialog.type === 'confirm' || activeDialog.type === 'prompt' ? 'Confirm' : 'OK')}
              </button>
            </>
          )
        }
      >
        <div className="flex-col gap-4">
          <div className="text-body m-0 whitespace-pre-wrap">
            {activeDialog?.options.message}
          </div>
          {activeDialog?.type === 'prompt' && (
            <div className="flex-col gap-1">
              <textarea
                autoFocus
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={activeDialog.options.placeholder}
                maxLength={activeDialog.options.maxLength}
                // @allow-inline-style - textarea default styling
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              {activeDialog.options.maxLength && (
                <div className="text-right text-[0.7rem] text-text-muted">
                  {promptValue.length} / {activeDialog.options.maxLength}
                </div>
              )}
            </div>
          )}
        </div>
      </BaseModal>
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used inside DialogProvider');
  }
  return context;
};
