export type RsvpStatus = 'Yes' | 'No' | 'Pending';

export function getRsvpStatusLabel(status: RsvpStatus): string {
  if (status === 'Yes') return 'Attending';
  if (status === 'No') return 'Declined';
  return 'No Response';
}

export function getRsvpExportGroupLabel(status: RsvpStatus): string {
  if (status === 'Yes') return 'Attending (Yes)';
  if (status === 'No') return 'Declined (No)';
  return 'No Response (Pending)';
}
