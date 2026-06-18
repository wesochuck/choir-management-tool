import type { ReactNode } from 'react';

export interface AdminPageTab<T extends string> {
  value: T;
  label: ReactNode;
}

interface AdminPageTabsProps<T extends string> {
  tabs: AdminPageTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  actions?: ReactNode;
  ariaLabel?: string;
}

export function AdminPageTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  actions,
  ariaLabel = 'Page sections',
}: AdminPageTabsProps<T>) {
  return (
    <div className="flex w-full flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-px">
      <nav className="flex gap-3 md:gap-6" aria-label={ariaLabel}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
              }`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onTabChange(tab.value)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {actions && <div className="flex flex-wrap items-center gap-2 pb-1.5">{actions}</div>}
    </div>
  );
}
