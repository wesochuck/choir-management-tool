import { createContext, useContext } from 'react';

export type DialogVariant = 'info' | 'danger' | 'warning';

export interface MessageOptions {
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  variant?: DialogVariant;
}

export interface ConfirmOptions extends MessageOptions {
  cancelLabel?: string;
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}

export interface DialogContextValue {
  showMessage: (options: MessageOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  showToast: (message: string, duration?: number) => void;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used inside DialogProvider');
  }
  return context;
};
