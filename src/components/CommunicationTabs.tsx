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
    <div className="flex w-full items-center justify-between gap-4 overflow-x-auto border-b border-border pb-1 whitespace-nowrap">
      <div className="flex items-center gap-2">
        {secondaryTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-text-muted transition-all duration-150 hover:bg-primary-light/50 hover:text-text ${activeTab === tab.value ? 'bg-primary-light font-semibold text-primary-deep' : 'font-medium'}`}
            onClick={() => onTabChange(tab.value)}
          >
            <span>{tab.label}</span>
            {tab.value === 'drafts' && draftsCount > 0 && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-white">{draftsCount}</span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`ml-auto inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all duration-150 ${activeTab === 'compose' ? 'border-primary bg-primary text-white' : 'border-primary-light bg-primary-light text-primary-deep hover:border-primary hover:bg-primary hover:text-white'}`}
        onClick={() => onTabChange('compose')}
      >
        <span aria-hidden="true">+</span>
        <span>New Message</span>
      </button>
    </div>
  );
};

