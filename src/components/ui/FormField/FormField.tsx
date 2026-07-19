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

function injectInvalidProp(children: React.ReactNode, error?: string): React.ReactNode {
  if (error && isValidElement(children)) {
    const child = children as ReactElement<{ invalid?: boolean }>;
    return cloneElement(child, { invalid: true });
  }
  return children;
}

export function FormField({
  label,
  htmlFor,
  error,
  helpText,
  required = false,
  children,
}: FormFieldProps) {
  const childElement = injectInvalidProp(children, error);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-text text-sm font-medium" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-danger-text ml-0.5" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {childElement}
      {error && (
        <span className="text-danger-text text-xs" role="alert">
          {error}
        </span>
      )}
      {helpText && <span className="text-text-muted text-xs">{helpText}</span>}
    </div>
  );
}
