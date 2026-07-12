export function isSetupSuperuser(e: any): boolean {
  return !!(e.auth && e.auth.collectionName === '_superusers');
}

export function isSetupAdmin(e: any): boolean {
  return !!(e.auth && e.auth.collectionName === 'users' && e.auth.get('role') === 'admin');
}
