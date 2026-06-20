import React from 'react';

export interface FilterBarProps {
  children: React.ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end">{children}</div>;
}
