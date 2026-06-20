import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { EventTable } from '../../components/admin/EventTable';
import { EventModal } from '../../components/admin/EventModal';
import { BulkEventModal } from '../../components/admin/BulkEventModal';
import { PlayerLinkModal } from '../../components/admin/PlayerLinkModal';
import type { Event } from '../../services/eventService';
import { useDialog } from '../../contexts/DialogContext';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { Button, Spinner } from '../../components/ui';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminPageTabs } from '../../components/admin/AdminPageTabs';

import { useEventSettings } from './events/useEventSettings';
import { useEventFilters } from './events/useEventFilters';
import { useEventDeepLinking } from './events/useEventDeepLinking';
import { useEventPlayerLink } from './events/useEventPlayerLink';
import { useEventCommunicationDraft } from './events/useEventCommunicationDraft';
import { useEventCloneWorkflow } from './events/useEventCloneWorkflow';
import { useEventSaveWorkflow } from './events/useEventSaveWorkflow';

export default function EventsView(): React.JSX.Element {
  const dialog = useDialog();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { timezone } = useChoirSettings();

  const {
    events,
    performances,
    isLoading,
    error,
    addEvent,
    editEvent,
    removeEvent,
    bulkAddRehearsals,
  } = useEvents();

  const { venues, addVenue } = useVenues();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [cloningEventId, setCloningEventId] = useState<string | null>(null);

  const { communicationSettings, auditionSettings } = useEventSettings();

  const { activeTab, setActiveTab, showPastEvents, setShowPastEvents, filteredEvents } =
    useEventFilters(events);

  useEventDeepLinking({
    events,
    isLoading,
    searchParams,
    setSearchParams,
    setCloningEventId,
    setEditingEvent,
    setIsModalOpen,
  });

  const {
    handleOpenPlayer,
    isOpen: isPlayerLinkOpen,
    url: playerLinkUrl,
    eventTitle: playerLinkEventTitle,
    setIsOpen: setPlayerLinkOpen,
  } = useEventPlayerLink(dialog);

  const { handleSendMessage } = useEventCommunicationDraft({
    navigate,
    venues,
    timezone,
    communicationSettings,
  });

  const { handleClone } = useEventCloneWorkflow({
    setCloningEventId,
    setEditingEvent,
    setIsModalOpen,
  });

  const { handleSave } = useEventSaveWorkflow({
    editingEvent,
    cloningEventId,
    setCloningEventId,
    setIsModalOpen,
    addEvent,
    editEvent,
    venues,
    timezone,
    communicationSettings,
    navigate,
    dialog,
  });

  const handleEdit = (event: Event): void => {
    setCloningEventId(null);
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleAdd = (): void => {
    setCloningEventId(null);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleBulkAdd = (): void => {
    setCloningEventId(null);
    setEditingEvent(null);
    setIsBulkModalOpen(true);
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-8">
        <Spinner size="medium" />
        <div className="text-muted text-sm">Loading scheduled events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-danger-text bg-danger-bg mx-auto my-8 flex max-w-[500px] flex-col items-center rounded-xl p-8 text-center shadow-sm transition-all duration-200 hover:shadow-md">
        <span className="text-3xl" role="img" aria-label="Warning">
          ⚠️
        </span>
        <div className="text-danger-text text-lg font-semibold">Failed to load events</div>
        <p className="text-danger-text opacity-80">{error}</p>
        <Button onClick={() => window.location.reload()} variant="danger" size="small">
          Reload Page
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Event Management"
        description="Create and manage rehearsals, performances, and call times. Track attendance and edit seating charts."
        below={
          <AdminPageTabs
            ariaLabel="Event sections"
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              { value: 'all', label: 'All Events' },
              { value: 'performances', label: 'Performances' },
              { value: 'rehearsals', label: 'Rehearsals' },
            ]}
            actions={
              <>
                <label className="flex cursor-pointer flex-row items-center gap-2 text-sm font-semibold text-slate-500 select-none">
                  <input
                    type="checkbox"
                    checked={showPastEvents}
                    onChange={(e) => setShowPastEvents(e.target.checked)}
                    className="text-primary accent-primary focus:ring-primary/25 size-4 cursor-pointer rounded border-slate-300"
                  />
                  <span>Show past events</span>
                </label>

                <Button
                  onClick={handleBulkAdd}
                  variant="secondary"
                  className="px-3 font-semibold md:px-6"
                  title="Bulk Add Rehearsals"
                  icon={'⚡'}
                >
                  <span className="hidden md:inline">Bulk Add Rehearsals</span>
                </Button>

                <Button
                  onClick={handleAdd}
                  variant="primary"
                  className="animate-pulse-once px-3 font-semibold md:px-6"
                  title="Single Event"
                  icon={'➕'}
                >
                  <span className="hidden md:inline">Single Event</span>
                </Button>
              </>
            }
          />
        }
      />

      <EventTable
        events={filteredEvents}
        onEdit={handleEdit}
        onCreate={handleAdd}
        onSendMessage={handleSendMessage}
        onViewRoster={(event: Event) => navigate(`/admin/events/${event.id}/roster`)}
        onCheckAttendance={(event: Event) => navigate(`/admin/attendance?eventId=${event.id}`)}
        onViewSeating={(event: Event) => navigate(`/admin/seating?eventId=${event.id}`)}
        onOpenPlayer={handleOpenPlayer}
        onClone={handleClone}
        openAuditionEventId={
          auditionSettings?.enabled ? auditionSettings.defaultPerformanceId : undefined
        }
      />

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={removeEvent}
        initialData={editingEvent}
        performances={performances}
        venues={venues}
        onAddVenue={addVenue}
      />

      <BulkEventModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSave={bulkAddRehearsals}
        performances={performances}
        venues={venues}
      />

      <PlayerLinkModal
        isOpen={isPlayerLinkOpen}
        onClose={() => setPlayerLinkOpen(false)}
        url={playerLinkUrl}
        eventTitle={playerLinkEventTitle}
      />
    </div>
  );
}
