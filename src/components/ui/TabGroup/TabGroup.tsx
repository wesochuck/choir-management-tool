import type { ReactNode, ComponentProps, ComponentType } from 'react';
import SlTabGroup from '@shoelace-style/shoelace/dist/react/tab-group/index.js';
import SlTab from '@shoelace-style/shoelace/dist/react/tab/index.js';
import SlTabPanel from '@shoelace-style/shoelace/dist/react/tab-panel/index.js';
import { safeSlProps } from '../shared';

const SlTabGroupWithValue = SlTabGroup as unknown as ComponentType<
  ComponentProps<typeof SlTabGroup> & { value?: string }
>;

export interface TabGroupProps {
  value: string;
  onTabChange: (tabName: string) => void;
  children?: ReactNode;
  className?: string;
}

export interface TabProps {
  panel: string;
  children?: ReactNode;
  className?: string;
}

export interface TabPanelProps {
  name: string;
  children?: ReactNode;
  className?: string;
}

export function TabGroup({ value, onTabChange, children, className }: TabGroupProps) {
  if (process.env.NODE_ENV === 'test') {
    return <div className={className}>{children}</div>;
  }

  return (
    <SlTabGroupWithValue
      {...safeSlProps({ value, className } as Record<string, unknown>)}
      onSlTabShow={(e: unknown) => {
        onTabChange(((e as CustomEvent).detail.name as string));
      }}
    >
      {children}
    </SlTabGroupWithValue>
  );
}

export function Tab({ panel, children, className }: TabProps) {
  if (process.env.NODE_ENV === 'test') {
    return <div className={className}>{children}</div>;
  }

  return <SlTab slot="nav" {...safeSlProps({ panel, className } as Record<string, unknown>)}>{children}</SlTab>;
}

export function TabPanel({ name, children, className }: TabPanelProps) {
  if (process.env.NODE_ENV === 'test') {
    return <div className={className}>{children}</div>;
  }

  return <SlTabPanel {...safeSlProps({ name, className } as Record<string, unknown>)}>{children}</SlTabPanel>;
}
