import type { ComponentPropsWithoutRef } from 'react';
import styles from './Input.module.css';

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...rest }: InputProps) {
  const classNames = [styles.input];
  if (invalid) classNames.push(styles.invalid);
  if (className) classNames.push(className);
  return <input className={classNames.join(' ')} {...rest} />;
}
