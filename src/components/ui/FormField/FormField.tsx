import { isValidElement, cloneElement } from 'react';
import type { ReactElement } from 'react';

export interface FormFieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  children?: React.ReactNode;
}

export function FormField({ label, htmlFor, error, helpText, required = false, children }: FormFieldProps) {
  let childElement = children;

  if (error && isValidElement(childElement)) {
    const child = childElement as ReactElement<{ invalid?: boolean }>;
    childElement = cloneElement(child, { invalid: true });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-text" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger-text ml-0.5" aria-hidden="true"> *</span>}
      </label>
      {childElement}
      {error && <span className="text-xs text-danger-text" role="alert">{error}</span>}
      {helpText && <span className="text-xs text-text-muted">{helpText}</span>}
    </div>
  );
}
