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
