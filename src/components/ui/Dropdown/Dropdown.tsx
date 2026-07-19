import React, { useState, useRef, useEffect } from 'react';
import SlDropdown from '@shoelace-style/shoelace/dist/react/dropdown/index.js';
import SlMenu from '@shoelace-style/shoelace/dist/react/menu/index.js';
import SlMenuItem from '@shoelace-style/shoelace/dist/react/menu-item/index.js';
import { safeSlProps } from '../shared';

export interface DropdownProps extends React.ComponentPropsWithoutRef<'div'> {
  trigger: React.ReactElement;
  children: React.ReactNode;
  hoist?: boolean;
}

export function Dropdown({ trigger, children, hoist = true, className, ...rest }: DropdownProps) {
  const [testOpen, setTestOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'test') return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setTestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const typedTrigger = trigger as React.ReactElement<Record<string, unknown>>;

  if (process.env.NODE_ENV === 'test') {
    const triggerOnClick = typedTrigger.props.onClick;
    const clonedTrigger = React.cloneElement(typedTrigger, {
      onClick: (e: React.MouseEvent) => {
        if (typeof triggerOnClick === 'function') {
          (triggerOnClick as (ev: React.MouseEvent) => void)(e);
        }
        setTestOpen((prev) => !prev);
      },
    });

    return (
      <div ref={containerRef} className={`relative inline-block ${className || ''}`} {...rest}>
        {clonedTrigger}
        {testOpen && (
          <div className="absolute top-full right-0 z-[1000] mt-1 min-w-[180px] rounded-md border border-slate-200 bg-white shadow-lg">
            {children}
          </div>
        )}
      </div>
    );
  }

  // In production, clone trigger to inject slot="trigger"
  const slottedTrigger = React.cloneElement(typedTrigger, {
    slot: 'trigger',
  });

  return (
    <SlDropdown
      {...safeSlProps({
        hoist,
        className,
        ...(rest as Record<string, unknown>),
      } as Record<string, unknown>)}
    >
      {slottedTrigger}
      {children}
    </SlDropdown>
  );
}

export interface DropdownMenuProps extends React.ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode;
}

export function DropdownMenu({ children, className, ...rest }: DropdownMenuProps) {
  if (process.env.NODE_ENV === 'test') {
    return (
      <div className={`flex flex-col p-1 ${className || ''}`} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <SlMenu
      {...safeSlProps({
        className,
        ...(rest as Record<string, unknown>),
      } as Record<string, unknown>)}
    >
      {children}
    </SlMenu>
  );
}

export interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<'button'> {
  children: React.ReactNode;
}

function TestDropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
  ...rest
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full cursor-pointer border-none bg-transparent px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
  ...rest
}: DropdownMenuItemProps) {
  if (process.env.NODE_ENV === 'test') {
    return (
      <TestDropdownMenuItem
        onClick={onClick}
        className={className}
        disabled={disabled}
        {...rest}
      >
        {children}
      </TestDropdownMenuItem>
    );
  }

  return (
    <SlMenuItem
      {...safeSlProps({
        disabled,
        onClick,
        className,
        ...(rest as Record<string, unknown>),
      } as Record<string, unknown>)}
    >
      {children}
    </SlMenuItem>
  );
}
