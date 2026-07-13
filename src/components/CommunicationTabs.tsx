import type React from 'react';
import { Select } from './ui';
import { COMMUNICATION_SECTIONS, type CommunicationTab } from '../types/Communication';

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
  return (
    <div className="w-full">
      <div className="md:hidden">
        <label
          htmlFor="communications-section"
          className="text-text mb-1 block text-sm font-medium"
        >
          Communications section
        </label>
        <Select
          id="communications-section"
          aria-label="Communications section"
          value={activeTab}
          onChange={(event) => onTabChange(event.target.value as CommunicationTab)}
        >
          {COMMUNICATION_SECTIONS.map((section) => (
            <option key={section.value} value={section.value}>
              {section.value === 'drafts' && draftsCount > 0
                ? `${section.label} (${draftsCount})`
                : section.label}
            </option>
          ))}
        </Select>
      </div>

      <nav className="border-border hidden border-b md:block" aria-label="Communications sections">
        <div className="flex items-center gap-6">
          {COMMUNICATION_SECTIONS.map((section) => (
            <button
              key={section.value}
              type="button"
              className={`relative -mb-px flex min-h-[44px] cursor-pointer items-center gap-1.5 border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                activeTab === section.value
                  ? 'border-primary text-primary'
                  : 'text-text-muted hover:text-text border-transparent hover:border-slate-300'
              }`}
              onClick={() => onTabChange(section.value)}
              aria-current={activeTab === section.value ? 'page' : undefined}
            >
              <span>{section.label}</span>
              {section.value === 'drafts' && draftsCount > 0 && (
                <span className="bg-primary inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white">
                  {draftsCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
