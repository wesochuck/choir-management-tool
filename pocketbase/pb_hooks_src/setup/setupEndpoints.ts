import { isSetupSuperuser, isSetupAdmin } from './setupAuth';
import { resolveSetupStatus, getSetupState, saveSetupState } from './setupState';
import { parseJsonField } from '../email/hookJson';

interface PocketBaseAuth {
  id?: string;
  collectionName: string;
  get(key: string): unknown;
}

interface PocketBaseRequestInfo {
  host?: string;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface PocketBaseRequestEvent {
  auth?: PocketBaseAuth;
  json(status: number, data: unknown): unknown;
  requestInfo(): PocketBaseRequestInfo;
}

interface PocketBaseRecord {
  id: string;
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface PocketBaseCollection {
  name: string;
}

interface PocketBaseApp {
  findFirstRecordByFilter(
    collection: string,
    filter: string,
    params?: Record<string, unknown>
  ): PocketBaseRecord;
  findCollectionByNameOrId(name: string): PocketBaseCollection;
  findRecordsByFilter(
    collection: string,
    filter: string,
    sort: string,
    limit: number,
    offset: number
  ): PocketBaseRecord[];
  save(record: PocketBaseRecord): void;
  delete(record: PocketBaseRecord): void;
  runInTransaction(callback: () => void): void;
}

interface PocketBaseHttp {
  send(options: { url: string; method: string; headers?: Record<string, string> }): {
    statusCode: number;
  };
}

interface PocketBaseOs {
  getenv(key: string): string;
}

declare const $app: PocketBaseApp;
declare const Record: new (
  collection: PocketBaseCollection,
  data?: Record<string, unknown>
) => PocketBaseRecord;
declare const $http: PocketBaseHttp;
declare const $os: PocketBaseOs;

export function handleSetupStatus(e: PocketBaseRequestEvent): unknown {
  const status = resolveSetupStatus($app);

  // If authenticated as admin or superuser, return full details
  if (isSetupAdmin(e) || isSetupSuperuser(e)) {
    return e.json(200, status);
  }

  // Otherwise return only state and initialized
  return e.json(200, {
    state: status.state,
    initialized: status.initialized,
  });
}

export function handleSetupClaim(e: PocketBaseRequestEvent): unknown {
  if (!isSetupSuperuser(e)) {
    return e.json(403, { error: 'Forbidden: Superusers only' });
  }

  const body = e.requestInfo().body || {};
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  const passwordConfirm = String(body.passwordConfirm || '');
  const name = String(body.name || '').trim();
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

  let userRec: PocketBaseRecord | null = null;
  try {
    $app.runInTransaction(() => {
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
      state.ownerVoicePartSet = false;
      if (state.completedSections.indexOf('admin-account') === -1) {
        state.completedSections.push('admin-account');
      }
      saveSetupState($app, state);
    });

    return e.json(200, { success: true });
  } catch (err: unknown) {
    if (userRec) {
      try {
        $app.delete(userRec);
      } catch {
        // ignore
      }
    }
    // Propagate raw PocketBase API error
    throw err;
  }
}

export function handleSetupProgress(e: PocketBaseRequestEvent): unknown {
  if (!isSetupAdmin(e)) {
    return e.json(403, { error: 'Forbidden: Administrators only' });
  }

  const body = e.requestInfo().body || {};
  const completedSections = body.completedSections;

  if (!Array.isArray(completedSections)) {
    return e.json(400, { error: 'completedSections must be an array of strings' });
  }

  const state = getSetupState($app);
  // Verify completed sections are mapped as strings
  state.completedSections = completedSections.map(String);

  if (body.ownerIsPerformer !== undefined) {
    state.ownerIsPerformer = !!body.ownerIsPerformer;
  }
  if (body.ownerVoicePartSet !== undefined) {
    state.ownerVoicePartSet = !!body.ownerVoicePartSet;
  }

  saveSetupState($app, state);
  return e.json(200, { success: true });
}

export function handleSetupComplete(e: PocketBaseRequestEvent): unknown {
  if (!isSetupAdmin(e)) {
    return e.json(403, { error: 'Forbidden: Administrators only' });
  }

  let rosterEnabled = false;
  try {
    const record = $app.findFirstRecordByFilter('appSettings', "key = 'module_state'");
    const parsed = parseJsonField<{ enabled?: string[] }>(record.get('value'));
    if (parsed && Array.isArray(parsed.enabled)) {
      rosterEnabled = parsed.enabled.indexOf('roster') !== -1;
    }
  } catch {
    // Default to roster enabled if no setting exists yet
    rosterEnabled = true;
  }

  const state = getSetupState($app);
  const required = ['admin-account', 'organization-basics', 'module-selection'];
  let performingPartLabels: string[] = [];
  if (rosterEnabled) {
    required.push('roster-structure');
  }

  const missing = required.filter((sec) => state.completedSections.indexOf(sec) === -1);
  if (missing.length > 0) {
    return e.json(400, { error: 'Missing required setup sections: ' + missing.join(', ') });
  }

  try {
    const organizationRecord = $app.findFirstRecordByFilter(
      'appSettings',
      "key = 'choir_name'"
    );
    const organizationName = parseJsonField<string>(organizationRecord.get('value'));
    if (typeof organizationName !== 'string' || organizationName.trim() === '') {
      return e.json(400, { error: 'Organization name is not configured' });
    }
  } catch {
    return e.json(400, { error: 'Organization name is not configured' });
  }

  if (rosterEnabled) {
    try {
      const rosterRecord = $app.findFirstRecordByFilter(
        'appSettings',
        "key = 'voiceParts'"
      );
      const roster = parseJsonField<{
        sections?: Array<{ code?: unknown; trackOnly?: unknown }>;
        voiceParts?: Array<{ label?: unknown; sectionCode?: unknown }>;
      }>(rosterRecord.get('value'));
      if (
        !roster ||
        !Array.isArray(roster.sections) ||
        roster.sections.length === 0 ||
        !Array.isArray(roster.voiceParts) ||
        roster.voiceParts.length === 0
      ) {
        return e.json(400, { error: 'Roster structure is not configured' });
      }
      const performingSectionCodes = roster.sections
        .filter(
          (section) =>
            section.trackOnly !== true &&
            typeof section.code === 'string' &&
            section.code.trim() !== ''
        )
        .map((section) => String(section.code));
      performingPartLabels = roster.voiceParts
        .filter(
          (part) =>
            typeof part.label === 'string' &&
            part.label.trim() !== '' &&
            typeof part.sectionCode === 'string' &&
            performingSectionCodes.indexOf(part.sectionCode) !== -1
        )
        .map((part) => String(part.label));
      if (performingPartLabels.length === 0) {
        return e.json(400, { error: 'Roster structure is not configured' });
      }
    } catch {
      return e.json(400, { error: 'Roster structure is not configured' });
    }
  }

  if (state.ownerIsPerformer) {
    const userId = e.auth?.id || '';
    try {
      const ownerProfile = $app.findFirstRecordByFilter(
        'profiles',
        'user = {:userId}',
        { userId }
      );
      const voicePart = ownerProfile.get('voicePart');
      if (
        typeof voicePart !== 'string' ||
        voicePart.trim() === '' ||
        performingPartLabels.indexOf(voicePart) === -1
      ) {
        return e.json(400, { error: 'Owner performer part is not configured' });
      }
    } catch {
      return e.json(400, { error: 'Owner performer part is not configured' });
    }
  }

  state.initialized = true;
  saveSetupState($app, state);

  return e.json(200, { success: true });
}

export function handleAdminRecovery(e: PocketBaseRequestEvent): unknown {
  if (!isSetupSuperuser(e)) {
    return e.json(403, { error: 'Forbidden: Superusers only' });
  }

  const status = resolveSetupStatus($app);
  if (status.state !== 'recovery_required') {
    return e.json(400, { error: 'Admin recovery is not required' });
  }

  const body = e.requestInfo().body || {};
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  const passwordConfirm = String(body.passwordConfirm || '');
  const name = String(body.name || '').trim();

  if (!email || !password || !passwordConfirm || !name) {
    return e.json(400, { error: 'Missing required fields' });
  }

  if (password !== passwordConfirm) {
    return e.json(400, { error: 'Passwords do not match' });
  }

  let userRec: PocketBaseRecord | null = null;
  try {
    $app.runInTransaction(() => {
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
    });

    return e.json(200, { success: true });
  } catch (err: unknown) {
    if (userRec) {
      try {
        $app.delete(userRec);
      } catch {
        // ignore
      }
    }
    // Propagate raw PocketBase API error
    throw err;
  }
}

export function handleSetupHealth(e: PocketBaseRequestEvent): unknown {
  const status = resolveSetupStatus($app);
  if (status.state === 'unclaimed') {
    if (!isSetupSuperuser(e)) {
      return e.json(403, { error: 'Forbidden: Superusers only' });
    }
  } else {
    if (!isSetupAdmin(e) && !isSetupSuperuser(e)) {
      return e.json(403, { error: 'Forbidden: Administrators only' });
    }
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

  let stripeValid = false;
  if (stripeSecretKey) {
    try {
      const res = $http.send({
        url: 'https://api.stripe.com/v1/balance',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + stripeSecretKey,
        },
      });
      stripeValid = res.statusCode === 200;
    } catch {
      stripeValid = false;
    }

    try {
      let evidenceRecord: PocketBaseRecord;
      try {
        evidenceRecord = $app.findFirstRecordByFilter('appSettings', "key = 'stripe_verification'");
      } catch {
        const appSettingsColl = $app.findCollectionByNameOrId('appSettings');
        evidenceRecord = new Record(appSettingsColl, { key: 'stripe_verification' });
      }
      evidenceRecord.set(
        'value',
        JSON.stringify({
          provider: 'stripe',
          mode: stripeMode,
          checkedAt: new Date().toISOString(),
          success: stripeValid,
        })
      );
      $app.save(evidenceRecord);
    } catch {
      // Don't fail the health check if we fail to save verification evidence
    }
  }

  let appUrlMismatch = false;
  if (appUrl) {
    const requestHost = e.requestInfo().headers?.['host'] || '';
    if (requestHost) {
      let appUrlHost = appUrl;
      try {
        if (appUrl.indexOf('://') !== -1) {
          appUrlHost = appUrl.split('://')[1].split('/')[0];
        } else {
          appUrlHost = appUrl.split('/')[0];
        }
      } catch {
        // ignore
      }

      const cleanAppUrlHost = appUrlHost.split(':')[0];
      const cleanRequestHost = requestHost.split(':')[0];
      if (cleanAppUrlHost && cleanRequestHost && cleanAppUrlHost !== cleanRequestHost) {
        appUrlMismatch = true;
      }
    }
  }

  let emailValid = false;
  try {
    const emailRecord = $app.findFirstRecordByFilter('appSettings', "key = 'email_verification'");
    const parsed = JSON.parse(String(emailRecord.get('value')));
    emailValid = !!parsed.success;
  } catch {
    emailValid = false;
  }

  return e.json(200, {
    environment,
    stripeMode,
    stripeValid: stripeSecretKey ? stripeValid : null,
    appUrlMismatch,
    emailValid,
  });
}
