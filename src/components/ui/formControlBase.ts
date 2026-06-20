import type React from 'react';

/**
 * Shared Tailwind classes for all form controls (Input, Select, Textarea).
 * Does NOT include height — single-line controls add `formControlHeight`,
 * while Textarea auto-sizes to its rows prop.
 */
export const formControlBase =
  'w-full rounded-md border border-border bg-surface px-3 text-sm text-text outline-none transition-[border-color,box-shadow] duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]';

/** Standard height for single-line form controls (Input, Select default). */
export const formControlHeight = 'h-11';

/** Shoelace CSS custom properties for single-line controls (Input, Select). */
export const formControlStyles: React.CSSProperties = {
  '--sl-input-height': '2.75rem',
  '--sl-input-border-radius': '0.375rem',
  '--sl-input-font-size': '0.875rem',
  '--sl-input-border-color': 'var(--color-border)',
  '--sl-input-background-color': 'var(--color-surface)',
  '--sl-input-color': 'var(--color-text)',
  '--sl-input-focus-ring-color': 'rgba(74,124,89,0.25)',
  '--sl-input-focus-ring-width': '3px',
  '--sl-input-border-color-focus': 'var(--color-primary)',
} as React.CSSProperties;

/**
 * Shoelace CSS custom properties for Textarea.
 * Excludes --sl-input-height so rows/auto-sizing works correctly.
 */
export const formControlStylesNoHeight: React.CSSProperties = {
  '--sl-input-border-radius': '0.375rem',
  '--sl-input-font-size': '0.875rem',
  '--sl-input-border-color': 'var(--color-border)',
  '--sl-input-background-color': 'var(--color-surface)',
  '--sl-input-color': 'var(--color-text)',
  '--sl-input-focus-ring-color': 'rgba(74,124,89,0.25)',
  '--sl-input-focus-ring-width': '3px',
  '--sl-input-border-color-focus': 'var(--color-primary)',
} as React.CSSProperties;
