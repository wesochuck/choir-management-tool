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
      <div className="mx-auto my-8 flex max-w-[500px] flex-col items-center rounded-xl border-danger-text bg-danger-bg p-8 text-center shadow-sm transition-all duration-200 hover:shadow-md">
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
    <div className="flex w-full flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Event Management
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Create and manage rehearsals, performances, and call times. Track attendance and edit seating charts.
        </p>
      </div>

      {/* Tabs / Actions Navigation Bar */}
      <div className="no-print flex w-full flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-px">
        <div className="flex gap-3 md:gap-6">
          {(['all', 'performances', 'rehearsals'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'border-primary font-bold text-primary'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'all' ? 'All Events' : tab === 'performances' ? 'Performances' : 'Rehearsals'}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 pb-1.5">
          {/* Show past checkbox */}
          <label className="flex cursor-pointer flex-row items-center gap-2 text-sm font-semibold text-slate-500 select-none">
            <input
              type="checkbox"
              checked={showPastEvents}
              onChange={(e) => setShowPastEvents(e.target.checked)}
              className="size-4 cursor-pointer rounded border-slate-300 text-primary accent-primary focus:ring-primary/25"
            />
            <span>Show past events</span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBulkAdd}
              variant="secondary"
              className="px-3 font-semibold shadow-sm md:px-6"
              title="Bulk Add Rehearsals"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              }
            >
              <span className="hidden md:inline">Bulk Add Rehearsals</span>
            </Button>
            <Button
              onClick={handleAdd}
              variant="primary"
              className="animate-pulse-once px-3 font-semibold shadow-sm md:px-6"
              title="Single Event"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              <span className="hidden md:inline">Single Event</span>
            </Button>
          </div>
        </div>
      </div>

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
