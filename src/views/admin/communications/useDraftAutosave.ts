import { useState, useEffect, useCallback, useRef } from 'react';
import type { MessageRecord, SendMessageInput } from '../../../services/communicationService';

export type DraftSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export interface UseDraftAutosaveArgs {
  snapshot: SendMessageInput;
  activeDraftId: string | null;
  activeDraftUpdated: string | null;
  persist: (snapshot: SendMessageInput, id?: string) => Promise<MessageRecord>;
  fetchLatest: (id: string) => Promise<MessageRecord>;
  onSaved: (record: MessageRecord) => void;
  onReload: (record: MessageRecord) => void;
  delayMs?: number;
}

function fingerprintDraft(snapshot: SendMessageInput): string {
  return JSON.stringify({
    subject: snapshot.subject,
    content: snapshot.content,
    type: snapshot.type,
    recipients: snapshot.recipients,
    filters: snapshot.filters,
  });
}

function recordSnapshot(record: MessageRecord): SendMessageInput {
  return {
    subject: record.subject,
    content: record.content,
    type: record.type,
    recipients: record.recipients,
    filters: record.filters,
  };
}

export function useDraftAutosave({
  snapshot,
  activeDraftId,
  activeDraftUpdated,
  persist,
  fetchLatest,
  onSaved,
  onReload,
  delayMs,
}: UseDraftAutosaveArgs) {
  const [status, setStatus] = useState<DraftSaveStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const [conflictDraft, setConflictDraft] = useState<MessageRecord | null>(null);
  const [drainVersion, setDrainVersion] = useState(0);

  const snapshotRef = useRef(snapshot);
  const activeIdRef = useRef<string | null>(activeDraftId);
  const lastUpdatedRef = useRef<string | null>(activeDraftUpdated);
  const savedFingerprintRef = useRef('');
  const lastAttemptedFingerprintRef = useRef('');
  const inFlightRef = useRef<Promise<void> | null>(null);
  const queuedRef = useRef(false);
  const conflictRef = useRef<MessageRecord | null>(null);

  const persistRef = useRef(persist);
  const onSavedRef = useRef(onSaved);
  const fetchLatestRef = useRef(fetchLatest);
  const onReloadRef = useRef(onReload);

  useEffect(() => {
    persistRef.current = persist;
    onSavedRef.current = onSaved;
    fetchLatestRef.current = fetchLatest;
    onReloadRef.current = onReload;
  });

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    activeIdRef.current = activeDraftId;
    lastUpdatedRef.current = activeDraftUpdated;
  }, [activeDraftId, activeDraftUpdated]);

  const saveNowRef = useRef<() => Promise<void>>(async () => {});

  const saveNow = useCallback(async (): Promise<void> => {
    if (conflictRef.current) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      await inFlightRef.current;
      return;
    }

    const snapshotToSave = snapshotRef.current;
    const fingerprintToSave = fingerprintDraft(snapshotToSave);
    if (fingerprintToSave === savedFingerprintRef.current) return;

    lastAttemptedFingerprintRef.current = fingerprintToSave;
    setStatus('saving');
    setError(null);

    const operation = (async () => {
      try {
        const saved = await persistRef.current(snapshotToSave, activeIdRef.current || undefined);
        activeIdRef.current = saved.id;
        lastUpdatedRef.current = saved.updated;
        savedFingerprintRef.current = fingerprintToSave;
        lastAttemptedFingerprintRef.current = fingerprintToSave;
        onSavedRef.current(saved);
      } catch (caught: unknown) {
        setError(caught);
        setStatus('error');
        return;
      } finally {
        inFlightRef.current = null;
      }

      const hasNewerSnapshot =
        fingerprintDraft(snapshotRef.current) !== savedFingerprintRef.current;
      if (queuedRef.current || hasNewerSnapshot) {
        queuedRef.current = false;
        setDrainVersion((value) => value + 1);
        void saveNowRef.current();
      } else {
        setStatus('saved');
      }
    })();

    inFlightRef.current = operation;
    await operation;
  }, []);

  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const id = activeIdRef.current;
      const knownUpdated = lastUpdatedRef.current;
      if (!id || !knownUpdated || inFlightRef.current) return;

      try {
        const latest = await fetchLatestRef.current(id);
        const isNewer = new Date(latest.updated).getTime() > new Date(knownUpdated).getTime();
        const changed = fingerprintDraft(recordSnapshot(latest)) !== savedFingerprintRef.current;
        if (isNewer && changed) {
          conflictRef.current = latest;
          setConflictDraft(latest);
          setStatus('conflict');
        }
      } catch {
        // A failed background comparison does not replace autosave's real save state.
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const debounceMs = delayMs ?? 1500;

  useEffect(() => {
    const currentFingerprint = fingerprintDraft(snapshot);
    const hasMeaningfulContent = Boolean(
      activeIdRef.current || snapshot.subject.trim() || snapshot.content.trim()
    );

    const isAlreadySaved = currentFingerprint === savedFingerprintRef.current;
    const isAlreadyAttempted = currentFingerprint === lastAttemptedFingerprintRef.current;

    if (
      !hasMeaningfulContent ||
      isAlreadySaved ||
      (isAlreadyAttempted && ['saving', 'error', 'conflict'].includes(status)) ||
      conflictRef.current
    ) {
      return;
    }

    setStatus('dirty');
    const timeoutId = window.setTimeout(() => {
      void saveNowRef.current();
    }, debounceMs);
    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, drainVersion, snapshot, status]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!['dirty', 'saving', 'error', 'conflict'].includes(status)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  const markHydrated = useCallback((draft: MessageRecord) => {
    activeIdRef.current = draft.id;
    lastUpdatedRef.current = draft.updated;
    const fp = fingerprintDraft(recordSnapshot(draft));
    savedFingerprintRef.current = fp;
    lastAttemptedFingerprintRef.current = fp;
    conflictRef.current = null;
    setConflictDraft(null);
    setError(null);
    setStatus('saved');
  }, []);

  const retry = useCallback(async () => {
    setError(null);
    await saveNowRef.current();
  }, []);

  const reloadLatest = useCallback(() => {
    const latest = conflictRef.current;
    if (!latest) return;
    onReloadRef.current(latest);
    markHydrated(latest);
  }, [markHydrated]);

  const saveAsCopy = useCallback(async (): Promise<void> => {
    setStatus('saving');
    setError(null);
    try {
      const snapshotToSave = snapshotRef.current;
      const saved = await persistRef.current(snapshotToSave, undefined);
      activeIdRef.current = saved.id;
      lastUpdatedRef.current = saved.updated;
      const fp = fingerprintDraft(snapshotToSave);
      savedFingerprintRef.current = fp;
      lastAttemptedFingerprintRef.current = fp;
      conflictRef.current = null;
      setConflictDraft(null);
      onSavedRef.current(saved);
      setStatus('saved');
    } catch (caught: unknown) {
      setError(caught);
      setStatus('error');
    }
  }, []);

  const triggerSaveNow = useCallback(async () => {
    await saveNowRef.current();
  }, []);

  return {
    status,
    error,
    conflictDraft,
    saveNow: triggerSaveNow,
    retry,
    markHydrated,
    reloadLatest,
    saveAsCopy,
  };
}
