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
}

interface DialogContextValue {
  showMessage: (options: MessageOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  showToast: (message: string, duration?: number) => void;
}

interface ActiveDialog {
  type: 'message' | 'confirm' | 'prompt';
  options: PromptOptions;
  resolve: (value: any) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  const closeDialog = useCallback((value: boolean | string | null) => {
    setActiveDialog((current) => {
      if (current?.type === 'prompt' && typeof value === 'boolean') {
        current.resolve(value ? promptValue : null);
      } else {
        current?.resolve(value);
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
      
      {/* Premium self-contained CSS Toast Keyframes */}
      <style>{`
        @keyframes toast-slide-in {
          from {
            transform: translateY(24px) scale(0.96);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {toast && (
        <div 
          key={toast.id}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: 'var(--text-color, #1f2937)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--radius, 8px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            animation: 'toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontSize: '15px' }}>ℹ️</span>
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
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <div className="text-body" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {activeDialog?.options.message}
          </div>
          {activeDialog?.type === 'prompt' && (
            <textarea
              autoFocus
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={activeDialog.options.placeholder}
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
