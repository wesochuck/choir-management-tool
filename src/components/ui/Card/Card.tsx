import styles from './Card.module.css';

export interface CardProps {
  children?: React.ReactNode;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function Card({ children, title, actions, noPadding = false, className }: CardProps) {
  const cardClass = [styles.card];
  if (noPadding) cardClass.push(styles.noPadding);
  if (className) cardClass.push(className);

  return (
    <div className={cardClass.join(' ')}>
      {(title || actions) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
