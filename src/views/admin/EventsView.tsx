import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { EventList } from '../../components/admin/EventList';
import { EventModal } from '../../components/admin/EventModal';
import { BulkEventModal } from '../../components/admin/BulkEventModal';
import type { Event } from '../../services/eventService';
import { useDialog } from '../../contexts/DialogContext';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { Button, Spinner } from '../../components/ui';

import { useEventSettings } from './events/useEventSettings';
import { useEventFilters } from './events/useEventFilters';
import { useEventDeepLinking } from './events/useEventDeepLinking';
import { useEventPlayerLink } from './events/useEventPlayerLink';
import { useEventCommunicationDraft } from './events/useEventCommunicationDraft';
import { useEventCloneWorkflow } from './events/useEventCloneWorkflow';
import { useEventSaveWorkflow } from './events/useEventSaveWorkflow';
import { EventsToolbar } from './events/EventsToolbar';
import { EventsTabs } from './events/EventsTabs';

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

  const {
    communicationSettings,
    auditionSettings,
    setAuditionSettings,
  } = useEventSettings();

  const {
    activeTab,
    setActiveTab,
    showPastEvents,
    setShowPastEvents,
    filteredEvents,
  } = useEventFilters(events);

  useEventDeepLinking({
    events,
    isLoading,
    searchParams,
    setSearchParams,
    setCloningEventId,
    setEditingEvent,
    setIsModalOpen,
  });

  const { handleOpenPlayer } = useEventPlayerLink({ dialog });

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
    auditionSettings,
    setAuditionSettings,
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
        <div className="text-muted text-sm">
          Loading scheduled events...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mx-auto my-8 flex max-w-[500px] flex-col items-center border-danger-text bg-danger-bg p-8 text-center">
        <span className="text-3xl" role="img" aria-label="Warning">⚠️</span>
        <div className="text-lg font-semibold text-danger-text">
          Failed to load events
        </div>
        <p className="text-danger-text opacity-80">
          {error}
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="danger"
          size="small"
        >
          Reload Page
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Event Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create and manage rehearsals, performances, and call times. Track attendance and edit seating charts.
          </p>
        </div>
        <div className="mt-1 flex-shrink-0">
          <EventsToolbar onBulkAdd={handleBulkAdd} onAdd={handleAdd} />
        </div>
      </div>

      <EventsTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showPastEvents={showPastEvents}
        setShowPastEvents={setShowPastEvents}
      />

      <EventList
        events={filteredEvents}
        onEdit={handleEdit}
        onSendMessage={handleSendMessage}
        onViewRoster={(event: Event) => navigate(`/admin/events/${event.id}/roster`)}
        onCheckAttendance={(event: Event) =>
          navigate(`/admin/attendance?eventId=${event.id}`)
        }
        onViewSeating={(event: Event) =>
          navigate(`/admin/seating?eventId=${event.id}`)
        }
        onOpenPlayer={handleOpenPlayer}
        onClone={handleClone}
        openAuditionEventId={
          auditionSettings?.enabled
            ? auditionSettings.defaultPerformanceId
            : undefined
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
    </div>
  );
}
