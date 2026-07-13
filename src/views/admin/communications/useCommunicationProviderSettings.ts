import { useEffect, useRef, useState } from 'react';
import type { EmailProviderSettings } from '../../../services/settingsService';

export function useCommunicationProviderSettings(settings?: EmailProviderSettings) {
  const initializedRef = useRef(false);
  const [emailProvider, setEmailProvider] = useState<'smtp' | 'brevo'>('smtp');
  const [brevoApiKey, setBrevoApiKey] = useState('');

  useEffect(() => {
    if (!settings || initializedRef.current) return;

    initializedRef.current = true;
    setEmailProvider(settings.provider);
    setBrevoApiKey(settings.brevoApiKey);
  }, [settings]);

  return {
    emailProvider,
    setEmailProvider,
    brevoApiKey,
    setBrevoApiKey,
  };
}
