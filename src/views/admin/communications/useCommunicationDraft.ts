import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  communicationService,
  type CommunicationFilters,
  type CommunicationRecipient,
  type MessageRecord,
  type MessageType,
  type AutomatedTaskStatusMap,
} from '../../../services/communicationService';
import type { ChoirUser } from '../../../types/auth';
import type { CommunicationTab } from '../../../types/Communication';
import type { WizardStep, CommunicationRouteState } from './types';
import { useDialog } from '../../../contexts/DialogContext';
import { checkValidation } from '../../../utils/communicationValidation';

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
  setDrafts,
  setAutomatedTaskStatus,
  dialog,
  setTab,
  setWizardStep,
}: UseCommunicationDraftArgs) {
  const [searchParams] = useSearchParams();
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const initialProfileIds = useMemo(() => {
    const ids = searchParams.get('recipientIds');
    return ids ? ids.split(',').filter(id => !!id) : [];
  }, [searchParams]);

  const [filters, setFilters] = useState<CommunicationFilters>({
    eventId: routeState?.initialEventId || '',
    rsvp: 'All',
    voiceParts: [],
    globalStatus: 'Active',
    profileIds: initialProfileIds.length > 0 ? initialProfileIds : undefined,
  });

  const [recipients, setRecipients] = useState<CommunicationRecipient[]>(
    routeState?.initialRecipients || [],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(routeState?.initialRecipients?.map((r) => r.id) || []),
  );
  const [lockInitialRecipients, setLockInitialRecipients] = useState(
    Boolean(
      (routeState?.initialOpenReview &&
        routeState?.initialRecipients &&
        routeState.initialRecipients.length > 0) ||
        routeState?.openDraftId ||
        initialProfileIds.length > 0
    ),
  );

  const [subject, setSubject] = useState(routeState?.initialSubject || '');
  const [content, setContent] = useState(routeState?.initialContent || '');
  const [messageType, setMessageType] = useState<MessageType>('Email');
  const [pollQuestions, setPollQuestions] = useState<Record<string, string>>(
    routeState?.initialPollQuestions ?? {},
  );

  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedIds.has(recipient.id)),
    [recipients, selectedIds],
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

  // Recipient resolution logic
  const hasResolvedRef = useRef(false);
  const recipientsRef = useRef(recipients);
  recipientsRef.current = recipients;

  useEffect(() => {
    if (tab !== 'compose') return;
    if (lockInitialRecipients && recipientsRef.current.length > 0) return;
    if (hasResolvedRef.current && !lockInitialRecipients) return;
    let isCurrent = true;
    hasResolvedRef.current = true;

    communicationService
      .resolveRecipients(filters)
      .then((resolved) => {
        if (!isCurrent) return;
        setRecipients(resolved);
        setSelectedIds(new Set(resolved.map((r) => r.id)));
      })
      .catch(() => {
        if (!isCurrent) return;
        setRecipients([]);
        setSelectedIds(new Set());
      });

    return () => {
      isCurrent = false;
    };
  }, [filters, tab, lockInitialRecipients]);

  const updateFilter = useCallback(
    <K extends keyof CommunicationFilters>(
      key: K,
      value: CommunicationFilters[K],
    ) => {
      if (lockInitialRecipients) setLockInitialRecipients(false);
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [lockInitialRecipients],
  );

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const input = {
        subject,
        content,
        type: messageType,
        recipients: selectedRecipients,
        filters: filters as unknown as Record<string, unknown>,
      };
      const record = await communicationService.saveDraft(
        input,
        activeDraftId || undefined,
      );
      setActiveDraftId(record.id);
      setDrafts(await communicationService.getDrafts());
      dialog.showToast('Your message has been saved as a draft.');
    } catch (err: unknown) {
      console.error(err);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to save draft.',
        variant: 'danger',
      });
    } finally {
      setIsSavingDraft(false);
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
      });

      if (draft.recipients && draft.recipients.length > 0) {
        setRecipients(draft.recipients);
        setSelectedIds(new Set(draft.recipients.map((r) => r.id)));
        setLockInitialRecipients(true);
      }

      setWizardStep('COMPOSE');
      setTab('compose');
    },
    [setTab, setWizardStep],
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
        message:
          'Test send delivers email only. Switch channel to Email and continue?',
        confirmLabel: 'Switch to Email',
      });
      if (!switchToEmail) return;
      setMessageType('Email');
    }

    setIsSendingTest(true);
    try {
      const adminName =
        (user as unknown as { name?: string })?.name || user.email || 'Admin';
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

      await communicationService.sendBulkMessage(input);
      dialog.showToast(`A test email has been sent to ${user.email}.`);
    } catch (err: unknown) {
      console.error(err);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to send test message.',
        variant: 'danger',
      });
    } finally {
      setIsSendingTest(false);
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

    const confirmSend = await dialog.confirm({
      title: 'Confirm Send',
      message: `Send this message to ${selectedRecipients.length} recipients?`,
      confirmLabel: 'Send Now',
    });
    if (!confirmSend) return;

    setIsSending(true);
    try {
      const input = {
        subject,
        content,
        type: messageType,
        recipients: selectedRecipients,
        filters: filters as unknown as Record<string, unknown>,
      };
      await communicationService.sendBulkMessage(
        input,
        activeDraftId || undefined,
      );

      if (filters.eventId) {
        const key =
          filters.rsvp === 'Pending'
            ? `rsvp-${filters.eventId}`
            : `reminder-${filters.eventId}`;
        setAutomatedTaskStatus((prev) => ({ ...prev, [key]: 'sent' }));
      }

      if (historyPage === 1) {
        void refreshHistory(1);
      } else {
        setHistoryPage(1);
      }
      setDrafts(await communicationService.getDrafts());
      setActiveDraftId(null);

      dialog.showToast('Message sent successfully!');
      setWizardStep('TARGETS');
    } catch (err: unknown) {
      console.error(err);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to send message.',
        variant: 'danger',
      });
    } finally {
      setIsSending(false);
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
    isSending,
    isSendingTest,
    isSavingDraft,
    handleSaveDraft,
    handleResumeDraft,
    handleSendTest,
    sendMessage,
  };
}
