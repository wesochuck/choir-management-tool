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
    <div className="communication-tabs">
      <div className="communication-tabs-secondary">
        {secondaryTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`communication-tab-link ${activeTab === tab.value ? 'active' : ''}`}
            onClick={() => onTabChange(tab.value)}
          >
            <span>{tab.label}</span>
            {tab.value === 'drafts' && draftsCount > 0 && (
              <span className="badge-count-bubble">{draftsCount}</span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`communication-tab-primary ${activeTab === 'compose' ? 'active' : ''}`}
        onClick={() => onTabChange('compose')}
      >
        <span aria-hidden="true">+</span>
        <span>New Message</span>
      </button>
    </div>
  );
};

