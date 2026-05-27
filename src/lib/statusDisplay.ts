export type DisplayTone = 'success' | 'danger' | 'warning' | 'muted' | 'primary';

interface StatusDisplay {
  label: string;
  tone: DisplayTone;
}

export function getAttendanceDisplay(status: string): StatusDisplay {
  if (status === 'Present') {
    return { label: 'Present', tone: 'success' };
  }

  if (status === 'Absent') {
    return { label: 'Absent', tone: 'danger' };
  }

  return { label: 'Pending', tone: 'muted' };
}

export function getRsvpDisplay(status: string): StatusDisplay {
  if (status === 'Yes') {
    return { label: 'Yes', tone: 'success' };
  }

  if (status === 'No') {
    return { label: 'No', tone: 'danger' };
  }

  return { label: 'Pending', tone: 'muted' };
}

export function getGlobalStatusDisplay(status: string): StatusDisplay {
  if (status === 'Active') {
    return { label: 'Active', tone: 'success' };
  }

  if (status === 'Idle') {
    return { label: 'Idle', tone: 'warning' };
  }

  if (status === 'Inactive') {
    return { label: 'Inactive', tone: 'danger' };
  }

  return { label: 'Active', tone: 'primary' };
}
