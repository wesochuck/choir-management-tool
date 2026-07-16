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
} from '../../../services/settingsService';

export function useCommunicationLibrary() {
  const queryClient = useQueryClient();

  const [editingTemplate, setEditingTemplate] = useState<Partial<TemplateRecord> | null>(null);

  const [historyPage, setHistoryPage] = useState(1);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const historyQuery = useQuery({
    queryKey: queryKeys.communications.historyPaginated(historyPage, historySearchQuery),
    queryFn: async () => {
      const baseFilter = "(status = 'Sent' || status = 'Archived')";
      let filterString = baseFilter;
      if (historySearchQuery.trim()) {
        filterString = pb.filter(
          `(${baseFilter} && (subject ~ {:query} || content ~ {:query} || type ~ {:query}))`,
          {
            query: historySearchQuery.trim(),
          }
        );
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
    queryFn: async () => {
      const templates = await communicationService.getTemplates();
      // Deduplicate by title to prevent showing duplicate seed data
      return templates.filter(
        (tpl, index, self) => index === self.findIndex((t) => t.title === tpl.title)
      );
    },
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
    setHistoryPage(1);
  }, [historySearchQuery]);

  const refreshHistory = useCallback(
    async (_page?: number) => {
      void _page;
      await queryClient.invalidateQueries({ queryKey: queryKeys.communications.history() });
    },
    [queryClient]
  );

  const isLoading =
    historyQuery.isLoading ||
    draftsQuery.isLoading ||
    templatesQuery.isLoading ||
    commSettingsQuery.isLoading ||
    commConfigQuery.isLoading ||
    choirNameQuery.isLoading;

  const setHistory: React.Dispatch<React.SetStateAction<MessageRecord[]>> = useCallback(
    (_value) => {
      void _value;
    },
    []
  );

  const setTotalPages: React.Dispatch<React.SetStateAction<number>> = useCallback((_value) => {
    void _value;
  }, []);

  const setIsLoading: React.Dispatch<React.SetStateAction<boolean>> = useCallback((_value) => {
    void _value;
  }, []);

  const setDrafts: React.Dispatch<React.SetStateAction<MessageRecord[]>> = useCallback(
    (_value) => {
      void _value;
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() });
    },
    [queryClient]
  );

  const setTemplates: React.Dispatch<React.SetStateAction<TemplateRecord[]>> = useCallback(
    (_value) => {
      void _value;
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.templates() });
    },
    [queryClient]
  );

  const setCommSettings: React.Dispatch<React.SetStateAction<CommunicationSettings>> = useCallback(
    (settingsOrUpdater) => {
      if (typeof settingsOrUpdater === 'function') {
        const current =
          queryClient.getQueryData<CommunicationSettings>(queryKeys.communications.settings()) ??
          DEFAULT_COMMUNICATION_SETTINGS;
        queryClient.setQueryData(
          queryKeys.communications.settings(),
          (settingsOrUpdater as (prev: CommunicationSettings) => CommunicationSettings)(current)
        );
      } else {
        queryClient.setQueryData(queryKeys.communications.settings(), settingsOrUpdater);
      }
    },
    [queryClient]
  );

  return {
    isLoading,
    setIsLoading,
    history: historyQuery.data?.items ?? [],
    setHistory,
    drafts: draftsQuery.data ?? [],
    setDrafts,
    templates: templatesQuery.data ?? [],
    setTemplates,
    commSettings: commSettingsQuery.data ?? DEFAULT_COMMUNICATION_SETTINGS,
    setCommSettings,
    commConfig: commConfigQuery.data ?? DEFAULT_COMMUNICATION_CONFIG,
    choirName: choirNameQuery.data ?? 'Choir Management',
    editingTemplate,
    setEditingTemplate,
    historyPage,
    setHistoryPage,
    totalPages: historyQuery.data?.totalPages ?? 1,
    setTotalPages,
    historySearchQuery,
    setHistorySearchQuery,
    refreshHistory,
    isSavingConfig,
    setIsSavingConfig,
  };
}
