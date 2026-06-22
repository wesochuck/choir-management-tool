import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import { calendarUtils } from '../../lib/calendar';
import { queryKeys } from '../../lib/queryKeys';
import { useDialog } from '../../contexts/DialogContext';

export interface EventDetails {
  id: string;
  title?: string;
  type: string;
  date: string;
  details?: string;
  location?: string;
  isOpenForRSVP?: boolean;
  expand?: {
    venue?: {
      name: string;
      address?: string;
    };
  };
}

export interface ProfileDetails {
  id: string;
  name: string;
  voicePart: string;
}

export function useRsvpData(searchParams: URLSearchParams) {
  const dialog = useDialog();

  let token = searchParams.get('token') || '';
  const pParam = searchParams.get('p');
  const sParam = searchParams.get('s');
  if (token && pParam && sParam && !token.includes('p=')) {
    token = `${token}&p=${pParam}&s=${sParam}`;
  }
  const initialRsvp = searchParams.get('rsvp') as 'Yes' | 'No' | null;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRsvp, setSelectedRsvp] = useState<'Yes' | 'No'>('Yes');
  const [dbRsvp, setDbRsvp] = useState<'Yes' | 'No' | 'Pending'>('Pending');
  const [rsvpNote, setRsvpNote] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showRehearsals, setShowRehearsals] = useState(false);

  const detailsQuery = useQuery({
    queryKey: queryKeys.publicRsvp.details(token),
    queryFn: () =>
      pb.send<{
        event: EventDetails;
        profile: ProfileDetails;
        currentRsvp: 'Yes' | 'No' | 'Pending';
        currentRsvpNote: string;
        rehearsals: EventDetails[];
        rsvpWindow?: {
          canSubmit: boolean;
          isReadOnly: boolean;
          reason: string;
        };
      }>('/api/rsvp-details', {
        method: 'POST',
        body: { token },
      }),
    enabled: !!token,
  });

  const timezoneQuery = useQuery({
    queryKey: queryKeys.publicRsvp.timezone(),
    queryFn: async () => {
      try {
        const setting = await pb
          .collection('appSettings')
          .getFirstListItem<{ value: { timezone?: string } }>('key = "timezone"');
        return setting?.value?.timezone || 'America/New_York';
      } catch {
        return 'America/New_York';
      }
    },
  });

  const event = detailsQuery.data?.event ?? null;
  const profile = detailsQuery.data?.profile ?? null;
  const rehearsals = detailsQuery.data?.rehearsals ?? [];
  const timezone = timezoneQuery.data ?? 'America/New_York';
  const rsvpWindow = detailsQuery.data?.rsvpWindow ?? {
    canSubmit: true,
    isReadOnly: false,
    reason: '',
  };

  const quickRsvpMutation = useMutation({
    mutationFn: (data: { token: string; rsvp: string; rsvpNote: string }) =>
      pb.send('/api/quick-rsvp', {
        method: 'POST',
        body: data,
      }),
  });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid RSVP link. Missing secure verification token.');
    }
  }, [token]);

  useEffect(() => {
    if (!detailsQuery.data) return;
    const res = detailsQuery.data;

    setRsvpNote(res.currentRsvpNote || '');
    setDbRsvp(res.currentRsvp || 'Pending');

    if (initialRsvp) {
      setSelectedRsvp(initialRsvp);
    } else if (res.currentRsvp !== 'Pending') {
      setSelectedRsvp(res.currentRsvp);
    }

    if (res.currentRsvp !== 'Pending') {
      setIsConfirmed(true);
    } else if (initialRsvp) {
      setIsConfirmed(false);
    }

    setStatus('success');
  }, [detailsQuery.data, initialRsvp]);

  useEffect(() => {
    if (!detailsQuery.isError) return;
    setStatus('error');
    const errObj = detailsQuery.error as { data?: { error?: string } } | null;
    setErrorMessage(
      errObj?.data?.error ||
        'This link is invalid or has expired. Please contact a choir administrator for a new link.'
    );
  }, [detailsQuery.isError, detailsQuery.error]);

  const handleConfirmRsvp = async (rsvpVal: 'Yes' | 'No', note: string = rsvpNote) => {
    if (!token || quickRsvpMutation.isPending || !event) return;

    if (event.type === 'Rehearsal' && rsvpVal === 'No' && !note.trim()) {
      await dialog.showMessage({
        title: 'Note Required',
        message: 'Please include a note explaining why you cannot attend this rehearsal.',
        variant: 'danger',
      });
      setSelectedRsvp('No');
      return;
    }

    if (note.trim().length > 1000) {
      await dialog.showMessage({
        title: 'Note Too Long',
        message: 'Your note cannot exceed 1000 characters.',
        variant: 'danger',
      });
      return;
    }

    try {
      await quickRsvpMutation.mutateAsync({
        token,
        rsvp: rsvpVal,
        rsvpNote: rsvpVal === 'No' ? note.trim() : '',
      });
      setSelectedRsvp(rsvpVal);
      setDbRsvp(rsvpVal);
      setRsvpNote(rsvpVal === 'No' ? note.trim() : '');
      setIsConfirmed(true);
    } catch (err: unknown) {
      const errObj = err as { data?: { error?: string } } | null;
      await dialog.showMessage({
        title: 'Could not record RSVP',
        message: errObj?.data?.error || 'Failed to record RSVP. Please try again.',
        variant: 'danger',
      });
    }
  };

  const handleDownloadCalendar = () => {
    if (event) {
      calendarUtils.generateICS(event);
    }
  };

  return {
    token,
    status,
    errorMessage,
    event,
    profile,
    rehearsals,
    timezone,
    rsvpWindow,
    selectedRsvp,
    setSelectedRsvp,
    dbRsvp,
    rsvpNote,
    setRsvpNote,
    isConfirmed,
    showRehearsals,
    setShowRehearsals,
    quickRsvpMutation,
    handleConfirmRsvp,
    handleDownloadCalendar,
  };
}
