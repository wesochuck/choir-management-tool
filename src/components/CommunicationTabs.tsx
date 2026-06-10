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
    <div className="flex items-center justify-between gap-4 w-full overflow-x-auto whitespace-nowrap pb-1 border-b border-border">
      <div className="flex items-center gap-2">
        {secondaryTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`inline-flex items-center gap-1.5 border-0 bg-transparent text-text-muted text-sm px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 hover:bg-primary-light/50 hover:text-text ${activeTab === tab.value ? 'bg-primary-light text-primary-deep font-semibold' : 'font-medium'}`}
            onClick={() => onTabChange(tab.value)}
          >
            <span>{tab.label}</span>
            {tab.value === 'drafts' && draftsCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-white leading-none">{draftsCount}</span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`inline-flex items-center justify-center gap-1.5 border px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ml-auto ${activeTab === 'compose' ? 'bg-primary border-primary text-white' : 'bg-primary-light border-primary-light text-primary-deep hover:bg-primary hover:border-primary hover:text-white'}`}
        onClick={() => onTabChange('compose')}
      >
        <span aria-hidden="true">+</span>
        <span>New Message</span>
      </button>
    </div>
  );
};

