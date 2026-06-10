export interface TabsProps {
  tabs: { id: string; label: React.ReactNode }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex border-b border-border mb-4" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTab}
          className={[
            'px-4 py-2 border-none bg-transparent text-sm font-medium text-text-muted cursor-pointer border-b-2 border-transparent transition-colors duration-200 whitespace-nowrap hover:text-text',
            tab.id === activeTab ? 'text-primary border-b-primary' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export interface TabPanelProps {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
}

export function TabPanel({ tabId, activeTab, children }: TabPanelProps) {
  const isActive = tabId === activeTab;
  return (
    <div role="tabpanel" hidden={isActive ? undefined : true}>
      {children}
    </div>
  );
}
