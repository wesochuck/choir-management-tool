export type DisplayTone = 'success' | 'danger' | 'warning' | 'muted' | 'primary';

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

export function getRsvpDisplay(status: string): StatusDisplay {
  switch (normalizeStatus(status)) {
    case 'yes':
      return { label: 'Yes', tone: 'success' };
    case 'no':
      return { label: 'No', tone: 'danger' };
    case 'pending':
      return { label: 'Pending', tone: 'muted' };
    default:
      return { label: 'Pending', tone: 'muted' };
  }
}

export function getGlobalStatusDisplay(status: string): StatusDisplay {
  switch (normalizeStatus(status)) {
    case 'active':
      return { label: 'Active', tone: 'success' };
    case 'idle':
      return { label: 'Idle', tone: 'warning' };
    case 'inactive':
      return { label: 'Inactive', tone: 'muted' };
    default:
      return { label: 'Unknown', tone: 'primary' };
  }
}
