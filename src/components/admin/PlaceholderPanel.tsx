import React from 'react';

interface Placeholder {
  tag: string;
  label: string;
  desc: string;
  category: 'Recipient' | 'Event' | 'RSVP';
  className: string;
}

const PLACEHOLDERS: Placeholder[] = [
  { tag: '{singerName}', label: 'Singer Name', desc: "Recipient's full name (e.g. 'John Doe')", category: 'Recipient', className: 'text-emerald-600 bg-emerald-50' },
  { tag: '{eventTitle}', label: 'Event Title', desc: 'The title of the selected event', category: 'Event', className: 'text-blue-600 bg-blue-50' },
  { tag: '{eventType}', label: 'Event Type', desc: "The type (e.g. 'Performance', 'Rehearsal')", category: 'Event', className: 'text-blue-600 bg-blue-50' },
  { tag: '{eventDate}', label: 'Event Date', desc: 'Formatted date and time of the event', category: 'Event', className: 'text-blue-600 bg-blue-50' },
  { tag: '{eventLocation}', label: 'Event Location', desc: 'Name of the venue for the event', category: 'Event', className: 'text-blue-600 bg-blue-50' },
  { tag: '{eventCallTime}', label: 'Event Call Time', desc: 'Formatted call time of the performance (e.g. 6:15 PM)', category: 'Event', className: 'text-blue-600 bg-blue-50' },
  { tag: '{eventDetails}', label: 'Event Details', desc: 'Administrative details/notes', category: 'Event', className: 'text-blue-600 bg-blue-50' },
  { tag: '{setlist}', label: 'Set List', desc: "The performance program (songs, composers, intermissions)", category: 'Event', className: 'text-blue-600 bg-blue-50' },
  { tag: '{{PLAYER_LINK}}', label: 'Practice Player', desc: 'Generates an unauthenticated standalone practice player button (requires Event context)', category: 'Event', className: 'text-purple-600 bg-purple-50' },
  { tag: '{{POLL_LINK:pollId}}', label: 'Engagement Poll', desc: 'Inserts a personalized "Volunteer" poll link (choose poll after clicking)', category: 'RSVP', className: 'text-amber-600 bg-amber-50' },
  { tag: '{{RSVP_LINKS}}', label: 'RSVP Buttons', desc: 'Generates beautiful "Yes/No" response buttons', category: 'RSVP', className: 'text-orange-600 bg-orange-50' },
];

interface PlaceholderPanelProps {
  onInsert: (tag: string) => void;
  hasEvent?: boolean;
  hasApprovedSetList?: boolean;
  hasCallTime?: boolean;
}

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({ 
  onInsert,
  hasEvent = true,
  hasApprovedSetList = true,
  hasCallTime = true
}) => {
  const visiblePlaceholders = PLACEHOLDERS.filter(p => {
    if (p.category === 'Recipient') return true;
    if (p.tag.startsWith('{{POLL_LINK:')) return true;
    if (!hasEvent) return false;
    if (p.tag === '{eventCallTime}') return hasCallTime;
    if (p.tag === '{{PLAYER_LINK}}') return hasApprovedSetList;
    return true;
  });

  const categories = Array.from(new Set(visiblePlaceholders.map(p => p.category))) as Placeholder['category'][];

  return (
    <div className="card p-4 bg-surface border border-border rounded-xl sticky top-6 max-h-[calc(100vh-120px)] flex flex-col gap-4 shadow-sm">
      <div className="border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <span>⚡</span>
          <h4 className="m-0 text-sm font-bold text-primary-deep">Placeholders</h4>
        </div>
        <p className="text-muted text-xs mt-1 m-0">
          Click any badge to insert dynamic text at cursor.
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto overflow-x-hidden pr-1">
        {categories.map(cat => {
          const items = visiblePlaceholders.filter(p => p.category === cat);
          return (
            <div key={cat} className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
                {cat} Placeholders
              </div>
              {items.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => onInsert(p.tag)}
                  className="flex flex-col items-start text-left p-2.5 bg-bg border border-border rounded-md h-auto cursor-pointer w-full transition-all duration-200 hover:bg-primary-light"
                  title={`Insert ${p.tag}`}
                >
                  <div className="flex justify-between w-full items-center">
                    <code className={`text-sm px-1.5 py-0.5 rounded font-bold ${p.className}`}>
                      {p.tag}
                    </code>
                    <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      + Insert
                    </span>
                  </div>
                  <span className="text-[0.72rem] text-text-muted mt-1 leading-tight">{p.desc}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
