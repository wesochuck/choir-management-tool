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
  const tabs: { value: CommunicationTab; label: string }[] = [
    { value: 'compose', label: 'New Message' },
    { value: 'automated', label: 'Automated' },
    { value: 'drafts', label: 'Drafts' },
    { value: 'history', label: 'History' },
    { value: 'settings', label: 'Settings' },
  ];

  return (
    <div className="communication-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`btn ${activeTab === tab.value ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onTabChange(tab.value)}
        >
          {tab.label}
          {tab.value === 'drafts' && draftsCount > 0 && (
            <span
              className="badge"
              style={{
                marginLeft: '8px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary-deep)',
              }}
            >
              {draftsCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
