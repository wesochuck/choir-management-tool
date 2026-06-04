import React, { useEffect, useId, useRef } from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  minHeight?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({ 
  isOpen, onClose, title, children, footer, maxWidth = '500px', minHeight
}) => {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (modalRef.current) {
          // 1. Try to find the primary submit button in the modal
          const submitButton = modalRef.current.querySelector<HTMLButtonElement>(
            'button[type="submit"]:not([disabled])'
          );
          if (submitButton) {
            event.preventDefault();
            submitButton.click();
            return;
          }

          // 2. Try to find any other primary action button
          const primaryButton = modalRef.current.querySelector<HTMLButtonElement>(
            '.btn-primary:not([disabled]), .btn-danger:not([disabled])'
          );
          if (primaryButton) {
            event.preventDefault();
            primaryButton.click();
            return;
          }

          // 3. Fallback: submit any form within the modal
          const form = modalRef.current.querySelector<HTMLFormElement>('form');
          if (form) {
            event.preventDefault();
            if (typeof form.requestSubmit === 'function') {
              form.requestSubmit();
            } else {
              form.submit();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Auto-focus the first visible focusable element only when the modal opens
  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      clearTimeout(focusTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      role="presentation"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 'var(--space-md)'
      }}
    >
      <div 
        ref={modalRef}
        className="card flex-col modal-content" 
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ 
          width: '100%', maxWidth, maxHeight: '90vh', 
          minHeight,
          overflowY: 'auto', gap: 'var(--space-lg)', 
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="flex-row" style={{ alignItems: 'center' }}>
          <h2 id={titleId} style={{ margin: 0 }}>{title}</h2>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          {children}
        </div>

        {footer && (
          <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'auto' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
