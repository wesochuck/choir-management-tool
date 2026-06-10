import { isValidElement, cloneElement } from 'react';
import type { ReactElement } from 'react';
import styles from './FormField.module.css';

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
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>
      {childElement}
      {error && <span className={styles.error} role="alert">{error}</span>}
      {helpText && <span className={styles.help}>{helpText}</span>}
    </div>
  );
}
