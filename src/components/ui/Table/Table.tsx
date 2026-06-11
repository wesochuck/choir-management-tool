import { EmptyState } from '../EmptyState/EmptyState';

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
    <table className="w-full border-collapse max-md:block">
      <thead className="max-md:hidden">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="border-b border-border px-4 py-2 text-left text-xs font-medium tracking-wider text-text-muted uppercase"
              // @allow-inline-style - dynamic column min-width from config
              style={col.width ? { minWidth: col.width } : undefined}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => {
          const rowClass = [
            'border-b border-border last:border-b-0 max-md:block max-md:p-4 max-md:border max-md:border-border max-md:rounded-md max-md:mb-2 max-md:bg-surface',
            onRowClick && 'cursor-pointer hover:bg-primary-light',
          ].filter(Boolean).join(' ');
          return (
            <tr key={keyExtractor(row)} className={rowClass}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2 text-sm text-text max-md:flex max-md:justify-between max-md:px-0 max-md:py-1 max-md:before:mr-4 max-md:before:font-medium max-md:before:text-text-muted max-md:before:content-[attr(data-label)]"
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
