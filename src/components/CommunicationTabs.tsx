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
                marginLeft: '6px',
                backgroundColor: '#f59e0b',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.72rem',
                minWidth: '18px',
                height: '18px',
                lineHeight: '18px',
                padding: '0 5px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
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
