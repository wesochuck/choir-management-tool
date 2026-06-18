import React from 'react';
import type { CommunicationTab } from '../types/Communication';

interface CommunicationTabsProps {
  activeTab: CommunicationTab;
  onTabChange: (tab: CommunicationTab) => void;
  draftsCount: number;
}

export const CommunicationTabs: React.FC<CommunicationTabsProps> = ({
  activeTab,
  onTabChange,
  draftsCount,
}) => {
  const secondaryTabs: { value: CommunicationTab; label: string }[] = [
    { value: 'automated', label: 'Automated' },
    { value: 'drafts', label: 'Drafts' },
    { value: 'history', label: 'History' },
    { value: 'settings', label: 'Settings' },
  ];

  return (
    <nav
      className="border-border flex w-full items-center gap-6 overflow-x-auto border-b"
      aria-label="Communications sections"
    >
      <div className="flex min-w-max items-center gap-6">
        {secondaryTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`relative -mb-px flex min-h-[44px] cursor-pointer items-center gap-1.5 border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors duration-150 ${
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'text-text-muted hover:text-text border-transparent hover:border-slate-300'
            }`}
            onClick={() => onTabChange(tab.value)}
            aria-current={activeTab === tab.value ? 'page' : undefined}
          >
            <span>{tab.label}</span>
            {tab.value === 'drafts' && draftsCount > 0 && (
              <span className="bg-primary inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white">
                {draftsCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
