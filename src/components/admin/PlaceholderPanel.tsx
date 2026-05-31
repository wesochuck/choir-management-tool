import React from 'react';

interface Placeholder {
  tag: string;
  label: string;
  desc: string;
  category: 'Recipient' | 'Event' | 'RSVP';
  color: string;
  bgColor: string;
}

const PLACEHOLDERS: Placeholder[] = [
  { tag: '{singerName}', label: 'Singer Name', desc: "Recipient's full name (e.g. 'John Doe')", category: 'Recipient', color: '#059669', bgColor: '#ecfdf5' },
  { tag: '{eventTitle}', label: 'Event Title', desc: 'The title of the selected event', category: 'Event', color: '#2563eb', bgColor: '#eff6ff' },
  { tag: '{eventType}', label: 'Event Type', desc: "The type (e.g. 'Performance', 'Rehearsal')", category: 'Event', color: '#2563eb', bgColor: '#eff6ff' },
  { tag: '{eventDate}', label: 'Event Date', desc: 'Formatted date and time of the event', category: 'Event', color: '#2563eb', bgColor: '#eff6ff' },
  { tag: '{eventLocation}', label: 'Event Location', desc: 'Name of the venue for the event', category: 'Event', color: '#2563eb', bgColor: '#eff6ff' },
  { tag: '{eventCallTime}', label: 'Event Call Time', desc: 'Formatted call time of the performance (e.g. 6:15 PM)', category: 'Event', color: '#2563eb', bgColor: '#eff6ff' },
  { tag: '{eventDetails}', label: 'Event Details', desc: 'Administrative details/notes', category: 'Event', color: '#2563eb', bgColor: '#eff6ff' },
  { tag: '{{PLAYER_LINK}}', label: 'Practice Player', desc: 'Generates an unauthenticated standalone practice player button (requires Event context)', category: 'Event', color: '#7c3aed', bgColor: '#f5f3ff' },
  { tag: '{{POLL_LINK:pollId}}', label: 'Engagement Poll', desc: 'Inserts a personalized "Volunteer" poll link (choose poll after clicking)', category: 'RSVP', color: '#7c4a4a', bgColor: '#fff1f1' },
  { tag: '{{RSVP_LINKS}}', label: 'RSVP Buttons', desc: 'Generates beautiful "Yes/No" response buttons', category: 'RSVP', color: '#d97706', bgColor: '#fffbeb' },
];

interface PlaceholderPanelProps {
  onInsert: (tag: string) => void;
  hasEvent?: boolean;
  hasApprovedSetList?: boolean;
}

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({ 
  onInsert,
  hasEvent = true,
  hasApprovedSetList = true
}) => {
  const visiblePlaceholders = PLACEHOLDERS.filter(p => {
    if (p.category === 'Recipient') return true;
    if (p.tag.startsWith('{{POLL_LINK:')) return true; // Engagement polls don't require event context
    if (!hasEvent) return false;
    if (p.tag === '{{PLAYER_LINK}}') return hasApprovedSetList;
    return true;
  });

  const categories = Array.from(new Set(visiblePlaceholders.map(p => p.category))) as Placeholder['category'][];

  return (
    <div 
      className="card placeholder-sticky-panel" 
      style={{ 
        padding: 'var(--space-md)', 
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg, 12px)',
        position: 'sticky',
        top: 'var(--space-lg, 24px)',
        maxHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
        boxShadow: 'var(--shadow-sm, 0 1px 3px 0 rgba(0, 0, 0, 0.05))',
      }}
    >
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-deep)' }}>
            Placeholders
          </h4>
        </div>
        <p className="text-muted" style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>
          Click any badge to insert dynamic text at cursor.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px', boxSizing: 'border-box' }}>
        {categories.map(cat => {
          const items = visiblePlaceholders.filter(p => p.category === cat);
          return (
            <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '2px' }}>
                {cat} Placeholders
              </div>
              {items.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => onInsert(p.tag)}
                  className="placeholder-badge-btn"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start', 
                    textAlign: 'left',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg, #f8fafc)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md, 8px)',
                    height: 'auto',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  title={`Insert ${p.tag}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <code style={{ 
                      fontSize: '0.82rem', 
                      color: p.color, 
                      backgroundColor: p.bgColor,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700 
                    }}>{p.tag}</code>
                    <span className="insert-indicator" style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, opacity: 0, transition: 'opacity 0.2s' }}>
                      + Insert
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.25' }}>{p.desc}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
