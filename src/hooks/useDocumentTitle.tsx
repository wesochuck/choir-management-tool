import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { settingsService } from '../services/settingsService';
import { formatDocumentTitle } from '../lib/documentTitle';
import { setCachedTimezone } from '../lib/timezone';

interface ChoirNameContextValue {
  choirName: string;
  setChoirName: (name: string) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
}

const ChoirNameContext = createContext<ChoirNameContextValue>({
  choirName: '',
  setChoirName: () => {},
  timezone: 'America/New_York',
  setTimezone: () => {},
});

export function ChoirNameProvider({ children }: { children: ReactNode }) {
  const [choirName, setChoirName] = useState('');
  const [timezone, setTimezoneState] = useState('America/New_York');

  useEffect(() => {
    settingsService.getChoirName().then(setChoirName).catch(() => {});
    settingsService.getTimezone().then(tz => {
      setTimezoneState(tz);
      setCachedTimezone(tz);
    }).catch(() => {});
  }, []);

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
    setCachedTimezone(tz);
  };

  return (
    <ChoirNameContext.Provider value={{ choirName, setChoirName, timezone, setTimezone }}>
      {children}
    </ChoirNameContext.Provider>
  );
}

export function useChoirName() {
  return useContext(ChoirNameContext);
}

export function useChoirSettings() {
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
