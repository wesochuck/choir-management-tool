import React from 'react';
import '../../views/admin/communications/Communications.css';

interface Placeholder {
  tag: string;
  label: string;
  desc: string;
  category: 'Recipient' | 'Event' | 'RSVP';
  className: string;
}

const PLACEHOLDERS: Placeholder[] = [
  { tag: '{singerName}', label: 'Singer Name', desc: "Recipient's full name (e.g. 'John Doe')", category: 'Recipient', className: 'comm-tag-recipient' },
  { tag: '{eventTitle}', label: 'Event Title', desc: 'The title of the selected event', category: 'Event', className: 'comm-tag-event' },
  { tag: '{eventType}', label: 'Event Type', desc: "The type (e.g. 'Performance', 'Rehearsal')", category: 'Event', className: 'comm-tag-event' },
  { tag: '{eventDate}', label: 'Event Date', desc: 'Formatted date and time of the event', category: 'Event', className: 'comm-tag-event' },
  { tag: '{eventLocation}', label: 'Event Location', desc: 'Name of the venue for the event', category: 'Event', className: 'comm-tag-event' },
  { tag: '{eventCallTime}', label: 'Event Call Time', desc: 'Formatted call time of the performance (e.g. 6:15 PM)', category: 'Event', className: 'comm-tag-event' },
  { tag: '{eventDetails}', label: 'Event Details', desc: 'Administrative details/notes', category: 'Event', className: 'comm-tag-event' },
  { tag: '{{PLAYER_LINK}}', label: 'Practice Player', desc: 'Generates an unauthenticated standalone practice player button (requires Event context)', category: 'Event', className: 'comm-tag-player' },
  { tag: '{{POLL_LINK:pollId}}', label: 'Engagement Poll', desc: 'Inserts a personalized "Volunteer" poll link (choose poll after clicking)', category: 'RSVP', className: 'comm-tag-poll' },
  { tag: '{{RSVP_LINKS}}', label: 'RSVP Buttons', desc: 'Generates beautiful "Yes/No" response buttons', category: 'RSVP', className: 'comm-tag-rsvp' },
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
    if (p.tag.startsWith('{{POLL_LINK:')) return true; // Engagement polls don't require event context
    if (!hasEvent) return false;
    if (p.tag === '{eventCallTime}') return hasCallTime;
    if (p.tag === '{{PLAYER_LINK}}') return hasApprovedSetList;
    return true;
  });

  const categories = Array.from(new Set(visiblePlaceholders.map(p => p.category))) as Placeholder['category'][];

  return (
    <div className="card comm-placeholder-panel">
      <div className="comm-placeholder-header">
        <div className="comm-placeholder-header-title">
          <span>⚡</span>
          <h4>Placeholders</h4>
        </div>
        <p className="text-muted comm-placeholder-header-desc">
          Click any badge to insert dynamic text at cursor.
        </p>
      </div>

      <div className="comm-placeholder-list">
        {categories.map(cat => {
          const items = visiblePlaceholders.filter(p => p.category === cat);
          return (
            <div key={cat} className="comm-placeholder-category">
              <div className="comm-placeholder-category-label">
                {cat} Placeholders
              </div>
              {items.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => onInsert(p.tag)}
                  className="comm-placeholder-item"
                  title={`Insert ${p.tag}`}
                >
                  <div className="comm-placeholder-item-row">
                    <code className={`comm-placeholder-tag ${p.className}`}>
                      {p.tag}
                    </code>
                    <span className="comm-placeholder-insert">
                      + Insert
                    </span>
                  </div>
                  <span className="comm-placeholder-desc">{p.desc}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
