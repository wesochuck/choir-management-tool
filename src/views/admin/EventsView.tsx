import { useState } from 'react';
import './EventsView.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { EventList } from '../../components/admin/EventList';
import { EventModal } from '../../components/admin/EventModal';
import { BulkEventModal } from '../../components/admin/BulkEventModal';
import type { Event } from '../../services/eventService';
import { useDialog } from '../../contexts/DialogContext';
import { useChoirSettings } from '../../hooks/useDocumentTitle';

import { useEventSettings } from './events/useEventSettings';
import { useEventFilters } from './events/useEventFilters';
import { useEventDeepLinking } from './events/useEventDeepLinking';
import { useEventPlayerLink } from './events/useEventPlayerLink';
import { useEventCommunicationDraft } from './events/useEventCommunicationDraft';
import { useEventCloneWorkflow } from './events/useEventCloneWorkflow';
import { useEventSaveWorkflow } from './events/useEventSaveWorkflow';
import { EventsToolbar } from './events/EventsToolbar';
import { EventsTabs } from './events/EventsTabs';

export default function EventsView() {
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

  const handleEdit = (event: Event) => {
    setCloningEventId(null);
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setCloningEventId(null);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleBulkAdd = () => {
    setCloningEventId(null);
    setEditingEvent(null);
    setIsBulkModalOpen(true);
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="flex-col events-loading">
        <div className="spinner-small events-spinner" />
        <div className="text-muted text-label events-spinner-text">
          Loading scheduled events...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex-col events-error">
        <span className="events-error-icon">⚠️</span>
        <div className="text-headline events-error-message">
          Failed to load events
        </div>
        <p className="text-muted events-error-detail">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-danger btn-sm"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="flex-col events-list-gap">
      <div className="admin-view-header">
        <h1 className="admin-view-title">Event Management</h1>
        <EventsToolbar onBulkAdd={handleBulkAdd} onAdd={handleAdd} />
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
        onViewRoster={(event) => navigate(`/admin/events/${event.id}/roster`)}
        onCheckAttendance={(event) =>
          navigate(`/admin/attendance?eventId=${event.id}`)
        }
        onViewSeating={(event) =>
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
