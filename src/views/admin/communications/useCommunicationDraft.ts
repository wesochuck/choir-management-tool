import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { queryKeys } from '../../../lib/queryKeys';
import {
  communicationService,
  type CommunicationFilters,
  type CommunicationRecipient,
  type MessageRecord,
  type MessageType,
  type AutomatedTaskStatusMap,
  type SendMessageInput,
} from '../../../services/communicationService';
import type { ChoirUser } from '../../../types/auth';
import type { CommunicationTab } from '../../../types/Communication';
import type { WizardStep, CommunicationRouteState } from './types';
import { useDialog } from '../../../contexts/DialogContext';
import { checkValidation } from '../../../utils/communicationValidation';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import {
  buildSendConfirmation,
  getReachableRecipients,
  summarizeRecipientReach,
} from './recipientReach';

interface UseCommunicationDraftArgs {
  routeState: CommunicationRouteState | null;
  user: ChoirUser | null;
  tab: CommunicationTab;
  historyPage: number;
  setHistoryPage: (page: number) => void;
  refreshHistory: (page: number) => Promise<void> | void;
  setDrafts: React.Dispatch<React.SetStateAction<MessageRecord[]>>;
  setAutomatedTaskStatus: React.Dispatch<React.SetStateAction<AutomatedTaskStatusMap>>;
  dialog: ReturnType<typeof useDialog>;
  setTab: (tab: CommunicationTab) => void;
  setWizardStep: (step: WizardStep) => void;
}

export function useCommunicationDraft({
  routeState,
  user,
  tab,
  historyPage,
  setHistoryPage,
  refreshHistory,
  setDrafts: _setDrafts,
  setAutomatedTaskStatus,
  dialog,
  setTab,
  setWizardStep,
}: UseCommunicationDraftArgs) {
  void _setDrafts;
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const initialProfileIds = useMemo(() => {
    const ids = searchParams.get('recipientIds');
    return ids ? ids.split(',').filter((id) => !!id) : [];
  }, [searchParams]);

  const [filters, setFilters] = useState<CommunicationFilters>({
    eventId: routeState?.initialEventId || '',
    rsvp: 'All',
    voiceParts: [],
    globalStatus: 'Active',
    profileIds: initialProfileIds.length > 0 ? initialProfileIds : undefined,
    targetAudiences: ['Members'],
  });

  const [recipients, setRecipients] = useState<CommunicationRecipient[]>(
    routeState?.initialRecipients || []
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(routeState?.initialRecipients?.map((r) => r.id) || [])
  );
  const [lockInitialRecipients, setLockInitialRecipients] = useState(
    Boolean(
      (routeState?.initialOpenReview &&
        routeState?.initialRecipients &&
        routeState.initialRecipients.length > 0) ||
      routeState?.openDraftId ||
      initialProfileIds.length > 0
    )
  );

  const [subject, setSubject] = useState(routeState?.initialSubject || '');
  const [content, setContent] = useState(routeState?.initialContent || '');
  const [messageType, setMessageType] = useState<MessageType>('Email');
  const [pollQuestions, setPollQuestions] = useState<Record<string, string>>(
    routeState?.initialPollQuestions ?? {}
  );

  const saveDraftMutation = useMutation({
    mutationFn: ({ data, id }: { data: SendMessageInput; id?: string }) =>
      communicationService.saveDraft(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.history() });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ data, draftId }: { data: SendMessageInput; draftId?: string }) =>
      communicationService.sendBulkMessage(data, draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.history() });
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() });
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: (input: SendMessageInput) => communicationService.sendBulkMessage(input),
  });

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedIds.has(recipient.id)),
    [recipients, selectedIds]
  );

  const recipientCounts = useMemo(() => {
    return {
      total: selectedRecipients.length,
      hasEmail: selectedRecipients.filter((m) => m.email?.trim()).length,
      hasPhone: selectedRecipients.filter((m) => m.phone?.trim()).length,
    };
  }, [selectedRecipients]);

  const warnings = useMemo(() => {
    return checkValidation(content, subject, messageType, filters.eventId);
  }, [content, subject, messageType, filters.eventId]);

  const recipientSelectionKey = useMemo(() => JSON.stringify(filters), [filters]);
  const initializedSelectionKeyRef = useRef<string | null>(null);

  const resolvedRecipientsQuery = useQuery({
    queryKey: queryKeys.communications.resolvedRecipients(filters),
    queryFn: () => communicationService.resolveRecipients(filters),
    enabled: tab === 'compose' && !(lockInitialRecipients && recipients.length > 0),
  });

  useEffect(() => {
    if (resolvedRecipientsQuery.error) {
      dialog.showToast('Failed to resolve recipients');
    }
  }, [resolvedRecipientsQuery.error, dialog]);

  useEffect(() => {
    if (resolvedRecipientsQuery.data) {
      setRecipients(resolvedRecipientsQuery.data);
      if (initializedSelectionKeyRef.current !== recipientSelectionKey) {
        initializedSelectionKeyRef.current = recipientSelectionKey;
        setSelectedIds(new Set(resolvedRecipientsQuery.data.map((recipient) => recipient.id)));
      } else {
        const availableIds = new Set(resolvedRecipientsQuery.data.map((recipient) => recipient.id));
        setSelectedIds(
          (previous) =>
            new Set([...previous].filter((recipientId) => availableIds.has(recipientId)))
        );
      }
    }
  }, [recipientSelectionKey, resolvedRecipientsQuery.data]);

  const updateFilter = useCallback(
    <K extends keyof CommunicationFilters>(key: K, value: CommunicationFilters[K]) => {
      if (lockInitialRecipients) setLockInitialRecipients(false);
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [lockInitialRecipients]
  );

  const handleSaveDraft = async () => {
    try {
      const input = {
        subject,
        content,
        type: messageType,
        recipients: selectedRecipients,
        filters: filters as unknown as Record<string, unknown>,
      };
      const record = await saveDraftMutation.mutateAsync({
        data: input,
        id: activeDraftId || undefined,
      });
      setActiveDraftId(record.id);
      dialog.showToast('Your message has been saved as a draft.');
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Draft Not Saved',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    }
  };

  const handleResumeDraft = useCallback(
    (draft: MessageRecord, options?: { asCopy?: boolean }) => {
      setActiveDraftId(options?.asCopy ? null : draft.id);
      setSubject(draft.subject);
      setContent(draft.content);
      setMessageType(draft.type);

      const mFilters = draft.filters as Record<string, unknown>;
      const vpArray: string[] = Array.isArray(mFilters?.voiceParts)
        ? (mFilters.voiceParts as string[])
        : mFilters?.voicePart
          ? [mFilters.voicePart as string]
          : [];

      setFilters({
        eventId: (mFilters?.eventId as string) || '',
        rsvp: (mFilters?.rsvp as CommunicationFilters['rsvp']) || 'All',
        voiceParts: vpArray,
        globalStatus: (mFilters?.globalStatus as string) || 'Active',
        // NEW: restore profileIds when resuming a draft
        profileIds: Array.isArray(mFilters?.profileIds)
          ? (mFilters.profileIds as string[])
          : undefined,
        targetAudiences: Array.isArray(mFilters?.targetAudiences)
          ? (mFilters.targetAudiences as CommunicationFilters['targetAudiences'])
          : ['Members'],
      });

      if (draft.recipients && draft.recipients.length > 0) {
        setRecipients(draft.recipients);
        setSelectedIds(new Set(draft.recipients.map((r) => r.id)));
        setLockInitialRecipients(true);
      }

      setWizardStep('COMPOSE');
      setTab('compose');
    },
    [setTab, setWizardStep]
  );

  const handleSendTest = async () => {
    if (!user?.email) {
      await dialog.showMessage({
        title: 'No Email',
        message: 'Your administrator account has no email address configured.',
        variant: 'danger',
      });
      return;
    }

    if (messageType === 'SMS') {
      const switchToEmail = await dialog.confirm({
        title: 'Email Test Only',
        message: 'Test send delivers email only. Switch channel to Email and continue?',
        confirmLabel: 'Switch to Email',
      });
      if (!switchToEmail) return;
      setMessageType('Email');
    }

    try {
      const adminName = (user as unknown as { name?: string })?.name || user.email || 'Admin';
      const testRecipient: CommunicationRecipient = {
        id: user.id,
        name: adminName,
        email: user.email,
        phone: '',
        voicePart: 'Admin',
        globalStatus: 'Admin',
      };

      const input = {
        subject: `[TEST] ${subject}`,
        content,
        type: 'Email' as const,
        recipients: [testRecipient],
        filters: {
          ...filters,
          isTest: true,
        } as unknown as Record<string, unknown>,
        status: 'Sent' as const,
      };

      await sendTestMutation.mutateAsync(input);
      dialog.showToast(`A test email has been sent to ${user.email}.`);
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Test Message Not Sent',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    }
  };

  const sendMessage = async () => {
    if (selectedRecipients.length === 0) {
      await dialog.showMessage({
        title: 'No Recipients',
        message: 'Select at least one recipient before sending.',
      });
      return;
    }

    const reach = summarizeRecipientReach(selectedRecipients, messageType);
    const reachableRecipients = getReachableRecipients(selectedRecipients, messageType);

    if (reachableRecipients.length === 0) {
      await dialog.showMessage({
        title: 'No Reachable Recipients',
        message: 'None of the selected recipients can receive the selected channel.',
        variant: 'warning',
      });
      return;
    }

    const confirmSend = await dialog.confirm({
      title: 'Confirm Send',
      message: buildSendConfirmation(subject, messageType, reach),
      confirmLabel:
        messageType === 'SMS' ? 'Send SMS' : messageType === 'Email' ? 'Send Email' : 'Send Both',
      cancelLabel: 'Cancel',
    });
    if (!confirmSend) return;

    try {
      const input = {
        subject,
        content,
        type: messageType,
        recipients: reachableRecipients,
        filters: filters as unknown as Record<string, unknown>,
      };
      await sendMessageMutation.mutateAsync({ data: input, draftId: activeDraftId || undefined });

      if (filters.eventId) {
        const key =
          filters.rsvp === 'Pending' ? `rsvp-${filters.eventId}` : `reminder-${filters.eventId}`;
        setAutomatedTaskStatus((prev) => ({ ...prev, [key]: 'sent' }));
      }

      if (historyPage === 1) {
        void refreshHistory(1);
      } else {
        setHistoryPage(1);
      }
      setActiveDraftId(null);

      dialog.showToast('Message sent successfully!');
      setWizardStep('TARGETS');
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Message Not Sent',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    }
  };

  return {
    activeDraftId,
    setActiveDraftId,
    filters,
    setFilters,
    updateFilter,
    recipients,
    setRecipients,
    selectedIds,
    setSelectedIds,
    lockInitialRecipients,
    setLockInitialRecipients,
    subject,
    setSubject,
    content,
    setContent,
    messageType,
    setMessageType,
    pollQuestions,
    setPollQuestions,
    selectedRecipients,
    recipientCounts,
    warnings,
    isSending: sendMessageMutation.isPending,
    isSendingTest: sendTestMutation.isPending,
    isSavingDraft: saveDraftMutation.isPending,
    handleSaveDraft,
    handleResumeDraft,
    handleSendTest,
    sendMessage,
  };
}

export type UseCommunicationDraftReturn = ReturnType<typeof useCommunicationDraft>;
