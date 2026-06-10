import { useCallback, useEffect, useState } from 'react';
import { pb } from '../../../lib/pocketbase';
import {
  communicationService,
  type MessageRecord,
  type TemplateRecord,
} from '../../../services/communicationService';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  DEFAULT_COMMUNICATION_CONFIG,
  settingsService,
  type CommunicationSettings,
  type CommunicationConfig,
} from '../../../services/settingsService';

export function useCommunicationLibrary() {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<MessageRecord[]>([]);
  const [drafts, setDrafts] = useState<MessageRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [commSettings, setCommSettings] =
    useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [commConfig, setCommConfig] =
    useState<CommunicationConfig>(DEFAULT_COMMUNICATION_CONFIG);
  const [choirName, setChoirName] = useState<string>('Choir Management');

  const [editingTemplate, setEditingTemplate] =
    useState<Partial<TemplateRecord> | null>(null);

  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const refreshHistory = useCallback(async (pageToFetch: number, query = '') => {
    try {
      const baseFilter = "(status = 'Sent' || status = 'Archived')";
      let filterString = baseFilter;

      if (query.trim()) {
        filterString = pb.filter(`(${baseFilter} && (subject ~ {:query} || content ~ {:query} || type ~ {:query}))`, {
          query: query.trim()
        });
      }

      const result = await communicationService.getMessagesPaginated(
        pageToFetch,
        10,
        filterString
      );
      setHistory(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to refresh message history', err);
    }
  }, []);

  useEffect(() => {
    void refreshHistory(historyPage, historySearchQuery);
  }, [historyPage, historySearchQuery, refreshHistory]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchQuery]);

  useEffect(() => {
    const load = async () => {
      try {
        const baseFilter = "(status = 'Sent' || status = 'Archived')";
        const [
          historyPageResult,
          loadedDrafts,
          loadedTemplates,
          loadedSettings,
          loadedConfig,
          loadedChoirName,
        ] = await Promise.all([
          communicationService.getMessagesPaginated(1, 10, baseFilter),
          communicationService.getDrafts(),
          communicationService.getTemplates(),
          settingsService.getCommunicationSettings(),
          settingsService.getCommunicationConfig(),
          settingsService.getChoirName(),
        ]);

        setHistory(historyPageResult.items);
        setTotalPages(historyPageResult.totalPages);
        setDrafts(loadedDrafts);
        setTemplates(loadedTemplates);
        setCommSettings(loadedSettings);
        setCommConfig(loadedConfig);
        if (loadedChoirName) setChoirName(loadedChoirName);
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
    commConfig,
    choirName,
    editingTemplate,
    setEditingTemplate,
    historyPage,
    setHistoryPage,
    totalPages,
    setTotalPages,
    historySearchQuery,
    setHistorySearchQuery,
    refreshHistory,
    isSavingConfig,
    setIsSavingConfig,
  };
}

