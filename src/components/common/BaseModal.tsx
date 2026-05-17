import React, { useEffect, useId, useRef } from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({ 
  isOpen, onClose, title, children, footer, maxWidth = '500px' 
}) => {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Auto-focus the first visible focusable element inside the modal
    const focusTimer = setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="card flex-col modal-content" 
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ 
          width: '100%', maxWidth, maxHeight: '90vh', 
          overflowY: 'auto', gap: 'var(--space-lg)', 
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id={titleId} style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close dialog" style={{ padding: '0 8px' }}>Close</button>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          {children}
        </div>

        {footer && (
          <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
