import { useEffect, useState } from 'react';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  settingsService,
  type AuditionSettings,
  type CommunicationSettings,
} from '../../../services/settingsService';

export function useEventSettings() {
  const [communicationSettings, setCommunicationSettings] =
    useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [auditionSettings, setAuditionSettings] =
    useState<AuditionSettings | null>(null);

  useEffect(() => {
    Promise.all([
      settingsService.getCommunicationSettings(),
      settingsService.getAuditionSettings(),
    ])
      .then(([comm, aud]) => {
        setCommunicationSettings(comm);
        setAuditionSettings(aud);
      })
      .catch(() => undefined);
  }, []);

  return {
    communicationSettings,
    setCommunicationSettings,
    auditionSettings,
    setAuditionSettings,
  };
}
