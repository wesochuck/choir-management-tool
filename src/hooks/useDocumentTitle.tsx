import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { settingsService } from '../services/settingsService';
import { formatDocumentTitle } from '../lib/documentTitle';

interface ChoirNameContextValue {
  choirName: string;
  setChoirName: (name: string) => void;
}

const ChoirNameContext = createContext<ChoirNameContextValue>({
  choirName: '',
  setChoirName: () => {},
});

export function ChoirNameProvider({ children }: { children: ReactNode }) {
  const [choirName, setChoirName] = useState('');

  useEffect(() => {
    settingsService.getChoirName().then(setChoirName).catch(() => {});
  }, []);

  return (
    <ChoirNameContext.Provider value={{ choirName, setChoirName }}>
      {children}
    </ChoirNameContext.Provider>
  );
}

export function useChoirName() {
  return useContext(ChoirNameContext);
}

/**
 * Sets document.title to "pageTitle - choirName" (or just pageTitle if no choir name).
 * Call from any page/view component.
 */
export function useDocumentTitle(pageTitle: string) {
  const { choirName } = useChoirName();

  useEffect(() => {
    document.title = formatDocumentTitle(pageTitle, choirName);
  }, [pageTitle, choirName]);
}
