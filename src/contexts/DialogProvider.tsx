import React, { useCallback, useMemo, useState } from 'react';
import { Modal } from '../components/ui/Modal/Modal';
import { Button } from '../components/ui/Button/Button';
import { DialogContext } from './DialogContext';
import type { MessageOptions, ConfirmOptions, PromptOptions, DialogVariant } from './DialogContext';

type ActiveDialog =
  | { type: 'message'; options: MessageOptions; resolve: () => void }
  | { type: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { type: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  const closeDialog = useCallback(
    (value: boolean | string | null) => {
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
    },
    [promptValue]
  );

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
      setToast((current) => (current?.id === id ? null : current));
    }, duration);
  }, []);

  const value = useMemo(
    () => ({ showMessage, confirm, prompt, showToast }),
    [showMessage, confirm, prompt, showToast]
  );
  const variant: DialogVariant = activeDialog?.options.variant || 'info';

  return (
    <DialogContext.Provider value={value}>
      {children}

      {toast && (
        <div
          key={toast.id}
          className="animate-toast-slide-in pointer-events-none fixed right-6 bottom-6 z-[9999] flex items-center gap-2 rounded-lg border border-white/10 bg-[var(--text-color,#1f2937)] px-5 py-3 text-xs font-medium text-white shadow-lg backdrop-blur"
        >
          <span className="text-sm">ℹ️</span>
          <span>{toast.message}</span>
        </div>
      )}

      <Modal
        isOpen={Boolean(activeDialog)}
        onClose={() => closeDialog(null)}
        title={activeDialog?.options.title || ''}
        maxWidth="440px"
        footer={
          activeDialog && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {(activeDialog.type === 'confirm' || activeDialog.type === 'prompt') && (
                <Button
                  variant="outline"
                  onClick={() => closeDialog(null)}
                  className="w-full sm:w-auto"
                >
                  {activeDialog.options.cancelLabel || 'Cancel'}
                </Button>
              )}
              <Button
                variant={
                  variant === 'danger' ? 'danger' : variant === 'warning' ? 'secondary' : 'primary'
                }
                disabled={
                  activeDialog.type === 'prompt' &&
                  activeDialog.options.required &&
                  !promptValue.trim()
                }
                onClick={() => closeDialog(true)}
                className="w-full sm:w-auto"
              >
                {activeDialog.options.confirmLabel ||
                  (activeDialog.type === 'confirm' || activeDialog.type === 'prompt'
                    ? 'Confirm'
                    : 'OK')}
              </Button>
            </div>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="text-body m-0 whitespace-pre-wrap">{activeDialog?.options.message}</div>
          {activeDialog?.type === 'prompt' && (
            <div className="flex flex-col gap-1">
              <textarea
                autoFocus
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={activeDialog.options.placeholder}
                maxLength={activeDialog.options.maxLength}
                className="border-border box-border min-h-[80px] w-full resize-y rounded-sm border p-[10px] font-[inherit] text-[0.9rem]"
              />
              {activeDialog.options.maxLength && (
                <div className="text-text-muted text-right text-[0.7rem]">
                  {promptValue.length} / {activeDialog.options.maxLength}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </DialogContext.Provider>
  );
};
