import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = '500px' }: ModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const firstInput = modalRef.current?.querySelector(
      'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement | null;
    firstInput?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex animate-[modal-fade-in_0.2s_ease-out] items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={handleOverlayClick}>
      <div ref={modalRef} className="flex w-full animate-[modal-slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-md" role="dialog" aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        // @allow-inline-style - dynamic maxWidth from props
        style={{ maxWidth }}>
        {title && (
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-2xl font-semibold text-text" id={titleId}>{title}</h2>
            <button className="inline-flex size-8 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-xl text-text-muted hover:bg-primary-light hover:text-primary-deep" onClick={onClose} aria-label="Close" type="button">
              ✕
            </button>
          </div>
        )}
        <div className="flex-1">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border pt-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
