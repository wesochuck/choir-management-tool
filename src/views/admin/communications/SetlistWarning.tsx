import { Link } from 'react-router-dom';
import type { Event } from '../../../services/eventService';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../../lib/labelHelpers';
import { useSetup } from '../../../contexts/SetupContext';

interface SetlistWarningProps {
  selectedEvent: Event | null;
  content: string;
}

export function SetlistWarning({ selectedEvent, content }: SetlistWarningProps) {
  const { performerLabel } = useChoirSettings();
  const { enabledModules } = useSetup();
  const setListsEnabled = enabledModules.has('setLists');
  const performerLabelPlural = pluralizeLabel(performerLabel);
  if (!selectedEvent) return null;
  if (selectedEvent.setListApproved !== false) return null;
  if (!content.toLowerCase().includes('{setlist}')) return null;

  return (
    <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-amber-100 border-l-amber-600 bg-amber-50 p-3 text-xs leading-normal text-amber-900 transition-transform duration-200 hover:translate-x-0.5">
      <span aria-hidden="true">⚠️</span>
      <span>
        <strong>Set list not approved.</strong> The set list hasn't been approved for{' '}
        {performerLabelPlural.toLowerCase()} yet.{' '}
        {setListsEnabled ? (
          <>
            <Link
              to="/admin/setlists"
              className="text-primary hover:text-primary-deep cursor-pointer font-semibold underline"
            >
              Open Set List Builder
            </Link>{' '}
            to approve it before sending.
          </>
        ) : (
          'Set Lists is currently disabled; enable it before approving the set list.'
        )}
      </span>
    </div>
  );
}
