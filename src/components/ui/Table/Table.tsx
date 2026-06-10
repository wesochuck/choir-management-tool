import { EmptyState } from '../EmptyState/EmptyState';
import styles from './Table.module.css';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
}

export function Table<T>({ columns, data, keyExtractor, onRowClick, emptyState }: TableProps<T>) {
  if (data.length === 0) {
    if (emptyState) return <div>{emptyState}</div>;
    return <EmptyState title="No data" />;
  }

  return (
    <table className={styles.table}>
      <thead className={styles.header}>
        <tr>
          {columns.map((col) => (
            <th key={col.key} className={styles.headerCell}
              // @allow-inline-style - dynamic column width from config
              style={col.width ? { minWidth: col.width } : undefined}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => {
          const rowClass = [styles.row];
          if (onRowClick) rowClass.push(styles.rowClickable);
          return (
            <tr key={keyExtractor(row)} className={rowClass.join(' ')}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={styles.cell}
                  data-label={typeof col.header === 'string' ? col.header : col.key}
                >
                  {col.render(row, index)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
