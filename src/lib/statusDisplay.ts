type DisplayTone = 'success' | 'danger' | 'warning' | 'muted' | 'primary';

interface StatusDisplay {
  label: string;
  tone: DisplayTone;
}

const normalizeStatus = (status: string): string => status.trim().toLowerCase();

export function getAttendanceDisplay(status: string): StatusDisplay {
  switch (normalizeStatus(status)) {
    case 'present':
      return { label: 'Present', tone: 'success' };
    case 'absent':
      return { label: 'Absent', tone: 'danger' };
    case 'pending':
      return { label: 'Pending', tone: 'muted' };
    default:
      return { label: 'Pending', tone: 'muted' };
  }
}

export interface RsvpDisplayOptions {
  variant?: 'plain' | 'eventRoster';
}

export function getRsvpDisplay(status: string, options: RsvpDisplayOptions = {}): StatusDisplay {
  const normalized = normalizeStatus(status);
  const isEventRoster = options.variant === 'eventRoster';

  if (isEventRoster) {
    switch (normalized) {
      case 'yes':
        return { label: '🟢 Attending', tone: 'success' };
      case 'no':
        return { label: '🔴 Declined', tone: 'danger' };
      case 'pending':
      default:
        return { label: '⏳ No Response', tone: 'muted' };
    }
  }

  switch (normalized) {
    case 'yes':
      return { label: 'Yes', tone: 'success' };
    case 'no':
      return { label: 'No', tone: 'danger' };
    case 'pending':
    default:
      return { label: 'Pending', tone: 'muted' };
  }
}

export function getGlobalStatusDisplay(status: string): StatusDisplay {
  switch (normalizeStatus(status)) {
    case 'active':
      return { label: 'Active', tone: 'success' };
    case 'idle':
      return { label: 'On Break', tone: 'warning' };
    case 'leave':
      return { label: 'On Leave', tone: 'warning' };
    case 'inactive':
      return { label: 'Inactive', tone: 'muted' };
    default:
      return { label: 'Unknown', tone: 'primary' };
  }
}
