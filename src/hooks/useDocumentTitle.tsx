import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
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

  const { data } = useQuery({
    queryKey: queryKeys.choirSettings.all,
    queryFn: async () => {
      const [name, tz] = await Promise.all([
        settingsService.getChoirName(),
        settingsService.getTimezone(),
      ]);
      return { name, timezone: tz };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;
    setChoirName(data.name);
    setTimezoneState(data.timezone);
    setCachedTimezone(data.timezone);
  }, [data]);

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
