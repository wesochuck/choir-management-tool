import '../MusicLibrary.css';

export function TrackBadge() {
  return (
    <span
      title="Has learning tracks"
      className="ml-track-badge"
    >
      🎧
    </span>
  );
}

export function MultiMovementBadge() {
  return (
    <span className="ml-badge ml-badge-multi">
      Multi-Movement
    </span>
  );
}

export function MovementBadge() {
  return (
    <span className="ml-badge ml-badge-mvt">
      Movement
    </span>
  );
}
