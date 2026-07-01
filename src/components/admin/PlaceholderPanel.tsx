import React from 'react';
import { useChoirSettings } from '../../hooks/useDocumentTitle';

export type PlaceholderContext = 'standard' | 'ticketConfirmation' | 'bundleTicketConfirmation';

interface Placeholder {
  tag: string;
  label: string;
  desc: string;
  category: 'Recipient' | 'Event' | 'RSVP' | 'Ticket' | 'Order' | 'Bundle' | 'Confirmation Page';
  className: string;
}

const STANDARD_PLACEHOLDERS: Placeholder[] = [
  {
    tag: '{singerName}',
    label: 'Singer Name',
    desc: "Recipient's full name (e.g. 'John Doe')",
    category: 'Recipient',
    className: 'text-emerald-600 bg-emerald-50',
  },
  {
    tag: '{eventTitle}',
    label: 'Event Title',
    desc: 'The title of the selected event',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{eventType}',
    label: 'Event Type',
    desc: "The type (e.g. 'Performance', 'Rehearsal')",
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{eventDate}',
    label: 'Event Date',
    desc: 'Formatted date and time of the event',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{eventLocation}',
    label: 'Event Location',
    desc: 'Name of the venue for the event',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{eventCallTime}',
    label: 'Event Call Time',
    desc: 'Formatted call time of the performance (e.g. 6:15 PM)',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{eventDetails}',
    label: 'Event Details',
    desc: 'Administrative details/notes',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{setlist}',
    label: 'Set List',
    desc: 'The performance program (songs, composers, intermissions)',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{{PLAYER_LINK}}',
    label: 'Practice Player',
    desc: 'Generates an unauthenticated standalone practice player button (requires Event context)',
    category: 'Event',
    className: 'text-purple-600 bg-purple-50',
  },
  {
    tag: '{{POLL_LINK:pollId}}',
    label: 'Engagement Poll',
    desc: 'Inserts a personalized "Volunteer" poll link (choose poll after clicking)',
    category: 'RSVP',
    className: 'text-amber-600 bg-amber-50',
  },
  {
    tag: '{{RSVP_LINKS}}',
    label: 'RSVP Buttons',
    desc: 'Generates beautiful "Yes/No" response buttons',
    category: 'RSVP',
    className: 'text-orange-600 bg-orange-50',
  },
];

const TICKET_CONFIRMATION_PLACEHOLDERS: Placeholder[] = [
  {
    tag: '{buyerName}',
    label: 'Buyer Name',
    desc: "Ticket buyer's name for Will Call",
    category: 'Ticket',
    className: 'text-emerald-600 bg-emerald-50',
  },
  {
    tag: '{eventTitle}',
    label: 'Event Title',
    desc: 'The title of the purchased event',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{eventDate}',
    label: 'Event Date',
    desc: 'Formatted date and time of the purchased event',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{doorsOpenTime}',
    label: 'Doors Open Time',
    desc: 'Doors-open time for the event',
    category: 'Event',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{quantity}',
    label: 'Ticket Quantity',
    desc: 'Number of tickets purchased',
    category: 'Order',
    className: 'text-purple-600 bg-purple-50',
  },
  {
    tag: '{amountPaid}',
    label: 'Amount Paid',
    desc: 'Total amount paid including fees',
    category: 'Order',
    className: 'text-purple-600 bg-purple-50',
  },
  {
    tag: '{choirName}',
    label: 'Choir Name',
    desc: 'Public choir name',
    category: 'Ticket',
    className: 'text-emerald-600 bg-emerald-50',
  },
  {
    tag: '{successUrl}',
    label: 'Ticket Confirmation Page',
    desc: 'Link back to the buyer\xe2\x80\x99s ticket confirmation page',
    category: 'Confirmation Page',
    className: 'text-amber-600 bg-amber-50',
  },
];

const BUNDLE_TICKET_CONFIRMATION_PLACEHOLDERS: Placeholder[] = [
  {
    tag: '{buyerName}',
    label: 'Buyer Name',
    desc: "Ticket buyer's name for Will Call",
    category: 'Ticket',
    className: 'text-emerald-600 bg-emerald-50',
  },
  {
    tag: '{bundleTitle}',
    label: 'Bundle Title',
    desc: 'Name of the ticket bundle or season pass',
    category: 'Bundle',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{eventDetails}',
    label: 'Included Events',
    desc: 'Formatted list of events included in the bundle',
    category: 'Bundle',
    className: 'text-blue-600 bg-blue-50',
  },
  {
    tag: '{quantity}',
    label: 'Bundle Quantity',
    desc: 'Number of bundle passes purchased',
    category: 'Order',
    className: 'text-purple-600 bg-purple-50',
  },
  {
    tag: '{amountPaid}',
    label: 'Amount Paid',
    desc: 'Total amount paid including fees',
    category: 'Order',
    className: 'text-purple-600 bg-purple-50',
  },
  {
    tag: '{choirName}',
    label: 'Choir Name',
    desc: 'Public choir name',
    category: 'Ticket',
    className: 'text-emerald-600 bg-emerald-50',
  },
  {
    tag: '{successUrl}',
    label: 'Ticket Confirmation Page',
    desc: 'Link back to the buyer\xe2\x80\x99s ticket confirmation page',
    category: 'Confirmation Page',
    className: 'text-amber-600 bg-amber-50',
  },
];

interface PlaceholderPanelProps {
  onInsert: (tag: string) => void;
  context?: PlaceholderContext;
  hasEvent?: boolean;
  hasApprovedSetList?: boolean;
  hasCallTime?: boolean;
}

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  onInsert,
  context = 'standard',
  hasEvent = true,
  hasApprovedSetList = true,
  hasCallTime = true,
}) => {
  const { performerLabel } = useChoirSettings();

  const basePlaceholders =
    context === 'ticketConfirmation'
      ? TICKET_CONFIRMATION_PLACEHOLDERS
      : context === 'bundleTicketConfirmation'
        ? BUNDLE_TICKET_CONFIRMATION_PLACEHOLDERS
        : STANDARD_PLACEHOLDERS.map((p) =>
            p.tag === '{singerName}' ? { ...p, label: `${performerLabel} Name` } : p
          );

  const visiblePlaceholders = basePlaceholders.filter((p) => {
    if (context !== 'standard') return true;

    if (p.category === 'Recipient') return true;
    if (p.tag.startsWith('{{POLL_LINK:')) return true;
    if (!hasEvent) return false;
    if (p.tag === '{eventCallTime}') return hasCallTime;
    if (p.tag === '{{PLAYER_LINK}}') return hasApprovedSetList;
    return true;
  });

  const categories = Array.from(
    new Set(visiblePlaceholders.map((p) => p.category))
  ) as Placeholder['category'][];

  return (
    <div className="border-border bg-surface sticky top-6 flex max-h-[calc(100vh-120px)] flex-col gap-4 rounded-xl border p-4 shadow-sm">
      <div className="border-border border-b pb-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">⚡</span>
          <h4 className="text-primary-deep m-0 text-sm font-bold">Placeholders</h4>
        </div>
        <p className="text-muted m-0 mt-1 text-xs">
          Click any badge to insert dynamic text at cursor.
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-x-hidden overflow-y-auto px-1">
        {categories.map((cat) => {
          const items = visiblePlaceholders.filter((p) => p.category === cat);
          return (
            <div key={cat} className="flex flex-col gap-1.5">
              <div className="text-text-muted mb-0.5 text-[10px] font-bold tracking-wider uppercase">
                {cat} Placeholders
              </div>
              {items.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => onInsert(p.tag)}
                  className="border-border bg-bg hover:bg-primary-light flex h-auto w-full cursor-pointer flex-col items-start rounded-md border p-2.5 text-left transition-all duration-200"
                  title={`Insert ${p.tag}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <code className={`rounded px-1.5 py-0.5 text-sm font-bold ${p.className}`}>
                      {p.tag}
                    </code>
                    <span className="text-primary text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                      + Insert
                    </span>
                  </div>
                  <span className="text-text-muted mt-1 text-[0.72rem] leading-tight">
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
