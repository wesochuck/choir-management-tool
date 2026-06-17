import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
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
  const queryClient = useQueryClient();

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

  const historyQuery = useQuery({
    queryKey: queryKeys.communications.historyPaginated(historyPage, historySearchQuery),
    queryFn: async () => {
      const baseFilter = "(status = 'Sent' || status = 'Archived')";
      let filterString = baseFilter;
      if (historySearchQuery.trim()) {
        filterString = pb.filter(`(${baseFilter} && (subject ~ {:query} || content ~ {:query} || type ~ {:query}))`, {
          query: historySearchQuery.trim()
        });
      }
      return communicationService.getMessagesPaginated(historyPage, 10, filterString);
    },
  });

  const draftsQuery = useQuery({
    queryKey: queryKeys.communications.drafts(),
    queryFn: () => communicationService.getDrafts(),
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.communications.templates(),
    queryFn: () => communicationService.getTemplates(),
  });

  const commSettingsQuery = useQuery({
    queryKey: queryKeys.communications.settings(),
    queryFn: () => settingsService.getCommunicationSettings(),
  });

  const commConfigQuery = useQuery({
    queryKey: queryKeys.communications.config(),
    queryFn: () => settingsService.getCommunicationConfig(),
  });

  const choirNameQuery = useQuery({
    queryKey: queryKeys.communications.choirName(),
    queryFn: () => settingsService.getChoirName(),
  });

  useEffect(() => {
    if (historyQuery.data) {
      setHistory(historyQuery.data.items);
      setTotalPages(historyQuery.data.totalPages);
    }
  }, [historyQuery.data]);

  useEffect(() => {
    if (draftsQuery.data) setDrafts(draftsQuery.data);
  }, [draftsQuery.data]);

  useEffect(() => {
    if (templatesQuery.data) setTemplates(templatesQuery.data);
  }, [templatesQuery.data]);

  useEffect(() => {
    if (commSettingsQuery.data) setCommSettings(commSettingsQuery.data);
  }, [commSettingsQuery.data]);

  useEffect(() => {
    if (commConfigQuery.data) setCommConfig(commConfigQuery.data);
  }, [commConfigQuery.data]);

  useEffect(() => {
    if (choirNameQuery.data) setChoirName(choirNameQuery.data);
  }, [choirNameQuery.data]);

  useEffect(() => {
    if (
      !historyQuery.isLoading &&
      !draftsQuery.isLoading &&
      !templatesQuery.isLoading &&
      !commSettingsQuery.isLoading &&
      !commConfigQuery.isLoading &&
      !choirNameQuery.isLoading
    ) {
      setIsLoading(false);
    }
  }, [
    historyQuery.isLoading,
    draftsQuery.isLoading,
    templatesQuery.isLoading,
    commSettingsQuery.isLoading,
    commConfigQuery.isLoading,
    choirNameQuery.isLoading,
  ]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchQuery]);

  const refreshHistory = useCallback(async (_page?: number) => {
    void _page;
    await queryClient.invalidateQueries({ queryKey: queryKeys.communications.history() });
  }, [queryClient]);

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

