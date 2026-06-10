import type { ComponentPropsWithoutRef } from 'react';
import styles from './Select.module.css';

export interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  invalid?: boolean;
}

export function Select({ invalid, className, ...rest }: SelectProps) {
  const classNames = [styles.select];
  if (invalid) classNames.push(styles.invalid);
  if (className) classNames.push(className);
  return <select className={classNames.join(' ')} {...rest} />;
}
