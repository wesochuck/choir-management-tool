import styles from './Tabs.module.css';

export interface TabsProps {
  tabs: { id: string; label: React.ReactNode }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className={styles.tabBar} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTab}
          className={[styles.tab, tab.id === activeTab ? styles.active : ''].join(' ').trim()}
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
    <div className={styles.panel} role="tabpanel" hidden={isActive ? undefined : true}>
      {children}
    </div>
  );
}
