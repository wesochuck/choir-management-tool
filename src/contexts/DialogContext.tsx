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

interface DialogContextValue {
  showMessage: (options: MessageOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface ActiveDialog {
  type: 'message' | 'confirm';
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);

  const closeDialog = useCallback((value: boolean) => {
    setActiveDialog((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

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

  const value = useMemo(() => ({ showMessage, confirm }), [showMessage, confirm]);
  const variant = activeDialog?.options.variant || 'info';

  return (
    <DialogContext.Provider value={value}>
      {children}
      <BaseModal
        isOpen={Boolean(activeDialog)}
        onClose={() => closeDialog(false)}
        title={activeDialog?.options.title || ''}
        maxWidth="440px"
        footer={
          activeDialog && (
            <>
              {activeDialog.type === 'confirm' && (
                <button className="btn btn-ghost" onClick={() => closeDialog(false)}>
                  {activeDialog.options.cancelLabel || 'Cancel'}
                </button>
              )}
              <button
                className={`btn ${
                  variant === 'danger' ? 'btn-danger' : 
                  variant === 'warning' ? 'btn-secondary' : 
                  'btn-primary'
                }`}
                onClick={() => closeDialog(true)}
              >
                {activeDialog.options.confirmLabel || (activeDialog.type === 'confirm' ? 'Confirm' : 'OK')}
              </button>
            </>
          )
        }
      >
        <div className="text-body" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {activeDialog?.options.message}
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
