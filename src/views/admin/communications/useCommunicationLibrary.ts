import { useCallback, useEffect, useState } from 'react';
import {
  communicationService,
  type MessageRecord,
  type TemplateRecord,
} from '../../../services/communicationService';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  settingsService,
  type CommunicationSettings,
} from '../../../services/settingsService';

export function useCommunicationLibrary() {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<MessageRecord[]>([]);
  const [drafts, setDrafts] = useState<MessageRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [commSettings, setCommSettings] =
    useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);

  const [editingTemplate, setEditingTemplate] =
    useState<Partial<TemplateRecord> | null>(null);

  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const refreshHistory = useCallback(async (pageToFetch: number) => {
    try {
      const result = await communicationService.getMessagesPaginated(pageToFetch, 5);
      setHistory(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to refresh message history', err);
    }
  }, []);

  useEffect(() => {
    void refreshHistory(historyPage);
  }, [historyPage, refreshHistory]);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          historyPageResult,
          loadedDrafts,
          loadedTemplates,
          loadedSettings,
        ] = await Promise.all([
          communicationService.getMessagesPaginated(1, 5),
          communicationService.getDrafts(),
          communicationService.getTemplates(),
          settingsService.getCommunicationSettings(),
        ]);

        setHistory(historyPageResult.items);
        setTotalPages(historyPageResult.totalPages);
        setDrafts(loadedDrafts);
        setTemplates(loadedTemplates);
        setCommSettings(loadedSettings);
      } catch (err) {
        console.error('Failed to load initial communication data', err);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return {
    isLoading,
    setIsLoading,
    history,
    setHistory,
    drafts,
    setDrafts,
    templates,
    setTemplates,
    commSettings,
    setCommSettings,
    editingTemplate,
    setEditingTemplate,
    historyPage,
    setHistoryPage,
    totalPages,
    setTotalPages,
    refreshHistory,
    isSavingConfig,
    setIsSavingConfig,
  };
}
