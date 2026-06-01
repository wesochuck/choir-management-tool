export function TrackBadge() {
  return (
    <span
      title="Has learning tracks"
      style={{
        fontSize: '13px',
        lineHeight: 1,
        cursor: 'default',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      🎧
    </span>
  );
}

export function MultiMovementBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: 'var(--primary-light, rgba(27, 77, 62, 0.1))',
        color: 'var(--primary, #1b4d3e)',
        fontSize: '10px',
        fontWeight: 600,
        border: '1px solid rgba(27, 77, 62, 0.2)',
        lineHeight: '1.2',
      }}
    >
      Multi-Movement
    </span>
  );
}

export function MovementBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 5px',
        borderRadius: '4px',
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
        color: 'var(--text-muted, #64748b)',
        fontSize: '9px',
        fontWeight: 500,
        border: '1px solid rgba(100, 116, 139, 0.2)',
        lineHeight: '1.2',
      }}
    >
      Movement
    </span>
  );
}
