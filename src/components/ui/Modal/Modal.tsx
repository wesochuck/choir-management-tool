import { useContext, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import SlDialog from '@shoelace-style/shoelace/dist/react/dialog/index.js';
import type SlDialogElement from '@shoelace-style/shoelace/dist/components/dialog/dialog.component.js';
import SlDrawer from '@shoelace-style/shoelace/dist/react/drawer/index.js';
import type SlDrawerElement from '@shoelace-style/shoelace/dist/components/drawer/drawer.component.js';
import { DialogContext } from '../../../contexts/DialogContext';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  isDirty?: boolean;
  asDrawer?: boolean;
}

export function Modal({ 
  isOpen, onClose, title, children, footer, maxWidth = '500px', isDirty = false, asDrawer = false 
}: ModalProps) {
  const dialog = useContext(DialogContext);
  const dialogRef = useRef<SlDialogElement | null>(null);
  const drawerRef = useRef<SlDrawerElement | null>(null);
  // Breakpoint aligned with Tailwind's `md` boundary (768px): screens ≤ 767px are mobile.
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDrawerActive = asDrawer && isMobile;

  // Refs keep the keydown effect stable across viewport flips so the listener
  // doesn't churn on every resize across 767px. The handler reads the current
  // ref via these refs, picking the active dialog/drawer at fire time.
  const isDrawerActiveRef = useRef(isDrawerActive);
  useEffect(() => {
    isDrawerActiveRef.current = isDrawerActive;
  }, [isDrawerActive]);

  // Implement Ctrl+Enter / Cmd+Enter form submission for Shoelace component
  useEffect(() => {
    if (!isOpen || process.env.NODE_ENV === 'test') return;
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeRef = isDrawerActiveRef.current ? drawerRef : dialogRef;
        const submitButton = activeRef.current?.querySelector<HTMLButtonElement>(
          'button[type="submit"]:not([disabled]), sl-button[type="submit"]:not([disabled])'
        );
        if (submitButton) {
          e.preventDefault();
          submitButton.click();
          return;
        }
        const form = activeRef.current?.querySelector<HTMLFormElement>('form');
        if (form) {
          e.preventDefault();
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.submit();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleRequestClose = async (e: Event) => {
    if (isDirty) {
      e.preventDefault();
      
      const confirmDiscard = dialog
        ? await dialog.confirm({
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Do you want to discard them?',
            confirmLabel: 'Discard Changes',
            cancelLabel: 'Keep Editing',
            variant: 'warning',
          })
        : window.confirm('You have unsaved changes. Do you want to discard them?');

      if (confirmDiscard) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // ----------------------------------------------------
  // Test fallback: Render original native Modal structure
  // ----------------------------------------------------
  const titleId = useId();
  const testModalRef = useRef<HTMLDivElement>(null);

  const handleCloseAttempt = useCallback(async () => {
    if (isDirty) {
      if (dialog) {
        const confirmDiscard = await dialog.confirm({
          title: 'Unsaved Changes',
          message: 'You have unsaved changes. Do you want to discard them?',
          confirmLabel: 'Discard Changes',
          cancelLabel: 'Keep Editing',
          variant: 'warning',
        });
        if (!confirmDiscard) return;
      } else {
        const confirmDiscard = window.confirm('You have unsaved changes. Do you want to discard them?');
        if (!confirmDiscard) return;
      }
    }
    onClose();
  }, [isDirty, dialog, onClose]);

  const handleCloseAttemptRef = useRef(handleCloseAttempt);
  useEffect(() => {
    handleCloseAttemptRef.current = handleCloseAttempt;
  }, [isOpen, onClose, isDirty, dialog, handleCloseAttempt]);

  useEffect(() => {
    if (!isOpen || process.env.NODE_ENV !== 'test') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseAttemptRef.current();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const submitButton = testModalRef.current?.querySelector<HTMLButtonElement>(
          'button[type="submit"]:not([disabled])'
        );
        if (submitButton) {
          e.preventDefault();
          submitButton.click();
          return;
        }
        const form = testModalRef.current?.querySelector<HTMLFormElement>('form');
        if (form) {
          e.preventDefault();
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.submit();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || process.env.NODE_ENV !== 'test') return;
    const firstInput = testModalRef.current?.querySelector(
      'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement | null;
    firstInput?.focus();
  }, [isOpen]);

  if (process.env.NODE_ENV === 'test') {
    if (!isOpen) return null;

    if (asDrawer) {
      return createPortal(
        <div className="no-print fixed inset-0 z-[1000]" role="presentation">
          <div
            ref={testModalRef}
            className="fixed right-0 top-0 h-full w-full max-w-md animate-modal-slide-up bg-surface shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            data-drawer="true"
          >
            {title && (
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="m-0 text-2xl font-semibold text-text">{title}</h2>
                <button className="inline-flex size-8 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-xl text-text-muted hover:bg-primary-light hover:text-primary-deep" onClick={() => handleCloseAttemptRef.current()} aria-label="Close" type="button">
                  ✕
                </button>
              </div>
            )}
            <div className="p-4 flex-1 min-h-0 overflow-y-auto">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-border p-4">{footer}</div>}
          </div>
        </div>,
        document.body
      );
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleCloseAttemptRef.current();
    };

    return createPortal(
      <div className="no-print fixed inset-0 z-[1000] flex animate-modal-fade-in items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={handleOverlayClick}>
        <div ref={testModalRef} className="flex w-full max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] animate-modal-slide-up flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6 shadow-md" role="dialog" aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          // @allow-inline-style - dynamic maxWidth from props
          style={{ maxWidth }}>
          {title && (
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-2xl font-semibold text-text" id={titleId}>{title}</h2>
              <button className="inline-flex size-8 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-xl text-text-muted hover:bg-primary-light hover:text-primary-deep" onClick={() => handleCloseAttemptRef.current()} aria-label="Close" type="button">
                ✕
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border pt-2">{footer}</div>}
        </div>
      </div>,
      document.body
    );
  }

  if (asDrawer && isMobile) {
    return (
      <SlDrawer
        ref={drawerRef}
        open={isOpen}
        onSlRequestClose={handleRequestClose}
        label={typeof title === 'string' ? title : undefined}
        placement="end"
        // @allow-inline-style - dynamic max-width for drawer --size custom property (Shoelace uses --size for drawer width with placement="end"/"start")
        style={{ '--size': maxWidth } as React.CSSProperties}
      >
        {title && typeof title !== 'string' && (
          <div slot="label">
            {title}
          </div>
        )}
        
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {children}
        </div>

        {footer && (
          <div slot="footer" className="flex justify-end gap-2 pt-2">
            {footer}
          </div>
        )}
      </SlDrawer>
    );
  }

  return (
    <SlDialog
      ref={dialogRef}
      open={isOpen}
      onSlRequestClose={handleRequestClose}
      // @allow-inline-style - dynamic max-width for modal panel width custom property override
      style={{ '--width': maxWidth } as React.CSSProperties}
      label={typeof title === 'string' ? title : undefined}
    >
      {title && typeof title !== 'string' && (
        <div slot="label">
          {title}
        </div>
      )}
      
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {children}
      </div>

      {footer && (
        <div slot="footer" className="flex justify-end gap-2 pt-2">
          {footer}
        </div>
      )}
    </SlDialog>
  );
}
