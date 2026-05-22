import React from 'react';

interface Placeholder {
  tag: string;
  label: string;
  desc: string;
}

const PLACEHOLDERS: Placeholder[] = [
  { tag: '{singerName}', label: 'Singer Name', desc: "The full name of the recipient (e.g. 'John Doe')." },
  { tag: '{eventTitle}', label: 'Event Title', desc: 'The title of the selected event.' },
  { tag: '{eventType}', label: 'Event Type', desc: "The type of event (e.g. 'Performance', 'Rehearsal')." },
  { tag: '{eventDate}', label: 'Event Date', desc: 'Formatted date and time of the event.' },
  { tag: '{eventLocation}', label: 'Event Location', desc: 'The name of the venue for the event.' },
  { tag: '{eventDetails}', label: 'Event Details', desc: 'The administrative notes/details for the event.' },
  { tag: '{{RSVP_LINKS}}', label: 'RSVP Links', desc: 'Generates secure "Yes/No" buttons with personalized tokens.' },
];

interface PlaceholderPanelProps {
  onInsert: (tag: string) => void;
}

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({ onInsert }) => {
  return (
    <div 
      className="card" 
      style={{ 
        padding: 'var(--space-md)', 
        backgroundColor: 'var(--surface-muted, #f8fafc)',
        border: '1px solid var(--border)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)'
      }}
    >
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-deep)' }}>
          Placeholders
        </h4>
        <p className="text-muted" style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>
          Click to insert into message body.
        </p>
      </div>

      <div className="flex-col" style={{ gap: 'var(--space-sm)', overflowY: 'auto' }}>
        {PLACEHOLDERS.map((p) => (
          <button
            key={p.tag}
            type="button"
            onClick={() => onInsert(p.tag)}
            className="btn btn-ghost btn-sm"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start', 
              textAlign: 'left',
              padding: '8px',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              height: 'auto',
              minHeight: 'auto'
            }}
            title={`Insert ${p.tag}`}
          >
            <code style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>{p.tag}</code>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{p.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
