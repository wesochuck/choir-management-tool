import { isSetupSuperuser, isSetupAdmin } from './setupAuth';
import { resolveSetupStatus, getSetupState, saveSetupState } from './setupState';
import { parseJsonField } from '../email/hookJson';

declare const $app: any;
declare const Record: any;
declare const $os: {
  getenv(key: string): string;
};

export function handleSetupStatus(e: any): any {
  return e.json(200, resolveSetupStatus($app));
}

export function handleSetupClaim(e: any): any {
  if (!isSetupSuperuser(e)) {
    return e.json(403, { error: 'Forbidden: Superusers only' });
  }

  const body = e.requestInfo().body || {};
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const passwordConfirm = body.passwordConfirm || '';
  const name = (body.name || '').trim();
  const isPerformer = !!body.isPerformer;

  if (!email || !password || !passwordConfirm || !name) {
    return e.json(400, { error: 'Missing required fields' });
  }

  if (password !== passwordConfirm) {
    return e.json(400, { error: 'Passwords do not match' });
  }

  // Idempotency check: see if admin user with this email already exists
  try {
    const existing = $app.findFirstRecordByFilter('users', 'email = {:email}', { email });
    if (existing && existing.get('role') === 'admin') {
      return e.json(200, { success: true });
    }
  } catch {
    // does not exist, safe to proceed
  }

  const status = resolveSetupStatus($app);
  if (status.state !== 'unclaimed') {
    return e.json(400, { error: 'Application is already claimed' });
  }

  let userRec: any = null;
  try {
    const usersColl = $app.findCollectionByNameOrId('users');
    userRec = new Record(usersColl, {
      email,
      emailVisibility: true,
      verified: true,
      password,
      passwordConfirm,
      role: 'admin',
    });
    $app.save(userRec);

    const profilesColl = $app.findCollectionByNameOrId('profiles');
    const profileRec = new Record(profilesColl, {
      user: userRec.id,
      name,
      globalStatus: 'Active (Current)',
      voicePart: '',
      receiveAttendanceReports: true,
    });
    $app.save(profileRec);

    // Save setup state progress
    const state = getSetupState($app);
    state.initialized = false;
    state.ownerIsPerformer = isPerformer;
    if (state.completedSections.indexOf('admin-account') === -1) {
      state.completedSections.push('admin-account');
    }
    saveSetupState($app, state);

    return e.json(200, { success: true });
  } catch (err: any) {
    if (userRec) {
      try {
        $app.delete(userRec);
      } catch {
        // ignore
      }
    }
    return e.json(400, { error: err.message || String(err) });
  }
}

export function handleSetupProgress(e: any): any {
  if (!isSetupAdmin(e)) {
    return e.json(403, { error: 'Forbidden: Administrators only' });
  }

  const body = e.requestInfo().body || {};
  const completedSections = body.completedSections;

  if (!Array.isArray(completedSections)) {
    return e.json(400, { error: 'completedSections must be an array of strings' });
  }

  const state = getSetupState($app);
  state.completedSections = completedSections;

  if (body.ownerIsPerformer !== undefined) {
    state.ownerIsPerformer = !!body.ownerIsPerformer;
  }
  if (body.ownerVoicePartSet !== undefined) {
    state.ownerVoicePartSet = !!body.ownerVoicePartSet;
  }

  saveSetupState($app, state);
  return e.json(200, { success: true });
}

export function handleSetupComplete(e: any): any {
  if (!isSetupAdmin(e)) {
    return e.json(403, { error: 'Forbidden: Administrators only' });
  }

  let rosterEnabled = false;
  try {
    const record = $app.findFirstRecordByFilter('appSettings', "key = 'module_state'");
    const parsed = parseJsonField<any>(record.get('value'));
    if (parsed && Array.isArray(parsed.enabled)) {
      rosterEnabled = parsed.enabled.indexOf('roster') !== -1;
    }
  } catch {
    // Default to roster enabled if no setting exists yet
    rosterEnabled = true;
  }

  const state = getSetupState($app);
  const required = ['admin-account', 'organization-basics', 'module-selection'];
  if (rosterEnabled) {
    required.push('roster-structure');
  }

  const missing = required.filter((sec) => state.completedSections.indexOf(sec) === -1);
  if (missing.length > 0) {
    return e.json(400, { error: 'Missing required setup sections: ' + missing.join(', ') });
  }

  state.initialized = true;
  saveSetupState($app, state);

  return e.json(200, { success: true });
}

export function handleAdminRecovery(e: any): any {
  if (!isSetupSuperuser(e)) {
    return e.json(403, { error: 'Forbidden: Superusers only' });
  }

  const status = resolveSetupStatus($app);
  if (status.state !== 'recovery_required') {
    return e.json(400, { error: 'Admin recovery is not required' });
  }

  const body = e.requestInfo().body || {};
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const passwordConfirm = body.passwordConfirm || '';
  const name = (body.name || '').trim();

  if (!email || !password || !passwordConfirm || !name) {
    return e.json(400, { error: 'Missing required fields' });
  }

  if (password !== passwordConfirm) {
    return e.json(400, { error: 'Passwords do not match' });
  }

  let userRec: any = null;
  try {
    const usersColl = $app.findCollectionByNameOrId('users');
    userRec = new Record(usersColl, {
      email,
      emailVisibility: true,
      verified: true,
      password,
      passwordConfirm,
      role: 'admin',
    });
    $app.save(userRec);

    const profilesColl = $app.findCollectionByNameOrId('profiles');
    const profileRec = new Record(profilesColl, {
      user: userRec.id,
      name,
      globalStatus: 'Active (Current)',
      voicePart: '',
      receiveAttendanceReports: true,
    });
    $app.save(profileRec);

    return e.json(200, { success: true });
  } catch (err: any) {
    if (userRec) {
      try {
        $app.delete(userRec);
      } catch {
        // ignore
      }
    }
    return e.json(400, { error: err.message || String(err) });
  }
}

export function handleSetupHealth(e: any): any {
  const status = resolveSetupStatus($app);
  if (status.state !== 'unclaimed' && !isSetupAdmin(e) && !isSetupSuperuser(e)) {
    return e.json(403, { error: 'Forbidden' });
  }

  const appUrl = $os.getenv('APP_URL') || '';
  const hmacSecret = $os.getenv('HMAC_SECRET') || '';
  const maintenanceSecret = $os.getenv('MAINTENANCE_SECRET') || '';
  const stripeSecretKey = $os.getenv('STRIPE_SECRET_KEY') || '';
  const stripeWebhookSecret = $os.getenv('STRIPE_WEBHOOK_SECRET') || '';

  const environment = {
    appUrl: !!appUrl,
    hmacSecret: !!hmacSecret,
    maintenanceSecret: !!maintenanceSecret,
    stripeSecretKey: !!stripeSecretKey,
    stripeWebhookSecret: !!stripeWebhookSecret,
  };

  let stripeMode = 'unknown';
  if (stripeSecretKey) {
    if (stripeSecretKey.indexOf('sk_test') === 0) {
      stripeMode = 'test';
    } else if (stripeSecretKey.indexOf('sk_live') === 0) {
      stripeMode = 'live';
    }
  }

  return e.json(200, {
    environment,
    stripeMode,
  });
}
