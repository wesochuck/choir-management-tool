import React from 'react';
import { AppCard } from '../common/AppCard';

interface SectionDef {
  code: string;
  name: string;
  count: number;
  selected?: boolean;
  onClick?: () => void;
}

interface VoicePartDef {
  label: string;
  count: number;
  selected?: boolean;
  onClick?: () => void;
}

interface VoicePartBalanceCardProps {
  title: string;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  className?: string;
}

export function VoicePartBalanceCard({
  title,
  sections,
  voiceParts,
  badges,
  actions,
  filters,
  className,
}: VoicePartBalanceCardProps) {
  return (
    <AppCard
      title={title}
      actions={
        <div className="flex flex-row items-center gap-2">
          {actions}
          {badges}
        </div>
      }
      className={className}
    >
      {filters && <div className="border-border flex flex-wrap gap-2 border-b pb-3">{filters}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => {
          const Component = section.onClick ? 'button' : 'div';
          return (
            <Component
              key={section.code}
              onClick={section.onClick}
              type={section.onClick ? 'button' : undefined}
              className={`bg-primary-light flex min-h-[92px] flex-col items-center justify-center rounded-lg border-2 p-4 text-center transition-colors ${
                section.selected
                  ? 'border-primary shadow-[0_0_0_1px_var(--color-primary)]'
                  : 'border-transparent'
              } ${section.onClick ? 'hover:bg-primary-light/80 cursor-pointer' : 'cursor-default'}`}
            >
              <div className="text-primary-deep text-xs font-bold tracking-wider uppercase">
                {section.name}
              </div>
              <div className="text-primary-deep text-4xl leading-none font-extrabold">
                {section.count}
              </div>
            </Component>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        {voiceParts.map((voicePart) => {
          const Component = voicePart.onClick ? 'button' : 'div';
          return (
            <Component
              key={voicePart.label}
              onClick={voicePart.onClick}
              type={voicePart.onClick ? 'button' : undefined}
              className={`flex min-h-[64px] flex-col justify-center rounded-lg border bg-white px-4 py-3 text-left transition-colors ${
                voicePart.selected
                  ? 'border-primary bg-primary-light shadow-[0_0_0_1px_var(--color-primary)]'
                  : 'border-border'
              } ${
                voicePart.onClick ? 'hover:bg-primary-light/60 cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="text-sm font-bold text-slate-700">{voicePart.label}</div>
              <div className="text-lg font-extrabold text-slate-800">{voicePart.count}</div>
            </Component>
          );
        })}
      </div>
    </AppCard>
  );
}
