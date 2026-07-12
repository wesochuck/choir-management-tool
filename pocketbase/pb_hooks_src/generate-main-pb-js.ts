import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SRC_DIR = path.join(process.cwd(), 'pocketbase/pb_hooks_src');
const OUTPUT_FILE = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');

export type UtilityBundleName =
  | 'hookJson'
  | 'hookText'
  | 'hookPlaceholders'
  | 'emailRendering'
  | 'emailStyles'
  | 'mailjetRenderer'
  | 'attendanceReport'
  | 'messageHookRules'
  | 'queueProcessor'
  | 'calendarEndpoint'
  | 'singerSeatingEndpoint'
  | 'hmacTokens'
  | 'timezone'
  | 'rsvpValidation'
  | 'adminNotifications'
  | 'attendanceFinalizer'
  | 'playerEndpoints'
  | 'stripeService'
  | 'pocketbaseDate'
  | 'checkoutEndpoints'
  | 'ticketScanValidation'
  | 'financialNotifications'
  | 'maintenance'
  | 'brevoAdapter'
  | 'setup';

export type UtilityBundle = {
  files: string[];
  symbols: string[];
  dependsOn?: UtilityBundleName[];
};

type CallbackOptions = {
  forceBundles?: UtilityBundleName[];
  excludeBundles?: UtilityBundleName[];
};

export const UTILITY_BUNDLES: Record<UtilityBundleName, UtilityBundle> = {
  hookJson: {
    files: ['email/hookJson.ts'],
    symbols: ['decodeGoBytes', 'parseJsonField'],
  },
  hookText: {
    files: ['email/hookText.ts'],
    symbols: [
      'escapeHtml',
      'sanitizeHtmlTemplateData',
      'sanitizeEmailSubject',
      'normalizeBaseUrl',
      'getTimezoneOffsetInfo',
      'formatInTimezone',
    ],
  },
  hookPlaceholders: {
    files: ['email/hookPlaceholders.ts'],
    symbols: ['renderSetlistHtml'],
    dependsOn: ['hookJson', 'hookText'],
  },
  emailRendering: {
    files: ['email/emailRendering.ts'],
    symbols: ['renderMarkdown'],
  },
  emailStyles: {
    files: ['email/emailStyles.ts'],
    symbols: ['EMAIL_CSS'],
  },
  mailjetRenderer: {
    files: ['email/mailjetRenderer.ts'],
    symbols: ['compileMailjetHtml'],
    dependsOn: ['emailStyles'],
  },
  attendanceReport: {
    files: ['email/attendanceReport.ts'],
    symbols: ['renderAttendanceReportBody'],
    dependsOn: ['hookText'],
  },
  messageHookRules: {
    files: ['email/messageHookRules.ts'],
    symbols: ['shouldQueueMessage', 'enqueueBulkMessage'],
    dependsOn: ['hookJson'],
  },
  queueProcessor: {
    files: ['email/queueProcessor.ts'],
    symbols: ['processEmailQueue'],
    dependsOn: [
      'hookJson',
      'hookText',
      'hookPlaceholders',
      'emailRendering',
      'mailjetRenderer',
      'hmacTokens',
      'pocketbaseDate',
      'brevoAdapter',
    ],
  },
  brevoAdapter: {
    files: ['email/brevoAdapter.ts'],
    symbols: ['dispatchEmailViaBrevo', 'dispatchSmsViaBrevo'],
  },
  calendarEndpoint: {
    files: ['calendarEndpoint.ts'],
    symbols: [
      'handleCalendarDownload',
      'handleCalendarFeed',
      'handleCalendarFeedUrl',
      'handleCalendarFeedReset',
    ],
    dependsOn: ['hookJson', 'hookText', 'timezone', 'hmacTokens', 'pocketbaseDate'],
  },
  singerSeatingEndpoint: {
    files: ['singerSeatingEndpoint.ts'],
    symbols: ['handleSingerSeatingProfiles'],
    dependsOn: ['hookJson'],
  },
  hmacTokens: {
    files: ['hmacTokens.ts'],
    symbols: [
      'getHmacSecret',
      'getPlayerPayload',
      'getEventRecipientPayload',
      'generateSignedPlayerToken',
      'generateSignedEventRecipientToken',
      'generateSignedTicketToken',
      'parseSignedToken',
    ],
    dependsOn: ['hookJson'],
  },
  timezone: {
    files: ['timezone.ts'],
    symbols: ['zonedInputValueToUtcLocal'],
    dependsOn: ['hookText'],
  },
  playerEndpoints: {
    files: ['playerEndpoints.ts'],
    symbols: ['handleGeneratePlayerToken', 'handlePlayerPlaylist', 'handleSingerPlayerPlaylist'],
    dependsOn: ['hmacTokens', 'hookJson'],
  },
  adminNotifications: {
    files: ['adminNotifications.ts'],
    symbols: ['notifyAdminsOfDecline'],
    dependsOn: ['queueProcessor', 'hookText'],
  },
  attendanceFinalizer: {
    files: ['attendanceFinalizer.ts'],
    symbols: ['finalizeUnmarkedAttendanceForEvent'],
  },
  rsvpValidation: {
    files: ['rsvpValidation.ts'],
    symbols: ['parsePocketBaseDate', 'validateSingerRsvpWindow', 'getRsvpWindowInfo'],
  },

  pocketbaseDate: {
    files: ['pocketbaseDate.ts'],
    symbols: ['coercePocketBaseDate', 'isPocketBaseDateAtOrAfter', 'isPocketBaseDateBefore'],
  },
  stripeService: {
    files: ['stripeService.ts'],
    symbols: ['createCheckoutSession', 'retrieveCheckoutSession', 'refundPaymentIntent'],
  },
  checkoutEndpoints: {
    files: [
      'checkout/checkoutHelpers.ts',
      'checkout/emailHelpers.ts',
      'checkout/createTicketsSession.ts',
      'checkout/createBundleSession.ts',
      'checkout/createDonationSession.ts',
      'checkout/stripeWebhook.ts',
      'checkout/adminRefundTicket.ts',
      'checkout/adminRefundBundle.ts',
      'checkout/adminRefundDonation.ts',
      'checkout/adminResendConfirmation.ts',
    ],
    symbols: [
      'handleCreateTicketsSession',
      'handleStripeWebhook',
      'expirePendingPaymentRecord',
      'expireStalePendingRecords',
      'handleAdminRefundTicket',
      'handleCreateBundleSession',
      'handleAdminRefundBundle',
      'handleCreateDonationSession',
      'handleAdminRefundDonation',
      'handleAdminResendTicketConfirmation',
    ],
    dependsOn: [
      'stripeService',
      'hookText',
      'timezone',
      'hookJson',
      'hmacTokens',
      'ticketScanValidation',
      'pocketbaseDate',
      'financialNotifications',
    ],
  },
  ticketScanValidation: {
    files: ['ticketScan/ticketValidation.ts'],
    symbols: ['handleValidateScan', 'handleGetScanContext'],
    dependsOn: ['hmacTokens', 'hookJson', 'hookText'],
  },
  financialNotifications: {
    files: ['checkout/financialNotifications.ts'],
    symbols: ['notifyOfFinancialEvent'],
    dependsOn: ['queueProcessor', 'hookJson'],
  },
  maintenance: {
    files: [
      'maintenance/maintenanceTypes.ts',
      'maintenance/maintenanceState.ts',
      'maintenance/maintenanceAuth.ts',
      'maintenance/emailQueueTask.ts',
      'maintenance/postEventReportTask.ts',
      'maintenance/ticketBuyerReminderTask.ts',
      'maintenance/cleanupTask.ts',
      'maintenance/eventReminderTask.ts',
      'maintenance/maintenanceRunner.ts',
    ],
    symbols: [
      'isMaintenanceRequestAuthorized',
      'runMaintenance',
      'runEmailQueueTask',
      'runPostEventReportTask',
      'runTicketBuyerReminderTask',
      'runEventReminderTask',
      'runCleanupTask',
      'getMaintenanceState',
      'saveMaintenanceState',
      'saveMaintenanceTaskRun',
      'isTaskDue',
      'hasActiveLock',
      'tryAcquireTaskLock',
      'releaseTaskLock',
    ],
    dependsOn: [
      'queueProcessor',
      'checkoutEndpoints',
      'hookJson',
      'hookText',
      'timezone',
      'pocketbaseDate',
      'attendanceFinalizer',
      'attendanceReport',
      'rsvpValidation',
      'hmacTokens',
      'emailRendering',
      'hookPlaceholders',
    ],
  },
  setup: {
    files: [
      'setup/setupTypes.ts',
      'setup/setupState.ts',
      'setup/setupAuth.ts',
      'setup/setupEndpoints.ts',
    ],
    symbols: [
      'resolveSetupStatus',
      'getSetupState',
      'saveSetupState',
      'isSetupSuperuser',
      'isSetupAdmin',
      'isBackendModuleEnabled',
      'guardBackendModule',
      'handleSetupStatus',
      'handleSetupClaim',
      'handleSetupProgress',
      'handleSetupComplete',
      'handleAdminRecovery',
      'handleSetupHealth',
    ],
    dependsOn: ['hookJson'],
  },
};

const transpileCache = new Map<string, string>();

function applyTextEdits(
  source: string,
  edits: { start: number; end: number; text: string }[]
): string {
  return [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (next, edit) => `${next.slice(0, edit.start)}${edit.text}${next.slice(edit.end)}`,
      source
    );
}

function stripModuleSyntaxSafely(source: string, fileName: string): string {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const edits: { start: number; end: number; text: string }[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
      edits.push({ start: statement.getFullStart(), end: statement.getEnd(), text: '' });
      continue;
    }

    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers) continue;

    for (const modifier of modifiers) {
      if (
        modifier.kind === ts.SyntaxKind.ExportKeyword ||
        modifier.kind === ts.SyntaxKind.DefaultKeyword
      ) {
        const start = modifier.getFullStart();
        const end = modifier.getEnd();
        edits.push({ start, end, text: '' });
      }
    }
  }

  return applyTextEdits(source, edits);
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return diagnostics
    .map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      if (!diagnostic.file || diagnostic.start === undefined) return message;
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} - ${message}`;
    })
    .join('\n');
}

export function transpileHookSource(source: string, fileName: string): string {
  const scriptSource = stripModuleSyntaxSafely(source, fileName);
  const result = ts.transpileModule(scriptSource, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.None,
      removeComments: false,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      ignoreDeprecations: '6.0',
    },
    reportDiagnostics: true,
  });

  const diagnostics = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (diagnostics.length > 0) {
    throw new Error(formatDiagnostics(diagnostics));
  }

  return result.outputText.trim();
}

function getTranspiledFile(fileName: string): string {
  const cached = transpileCache.get(fileName);
  if (cached !== undefined) return cached;

  const source = fs.readFileSync(path.join(SRC_DIR, fileName), 'utf8');
  const js = transpileHookSource(source, fileName);
  transpileCache.set(fileName, js);
  return js;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolveBundleDependencies(bundleNames: UtilityBundleName[]): UtilityBundleName[] {
  const resolved = new Set<UtilityBundleName>();

  function visit(name: UtilityBundleName): void {
    if (resolved.has(name)) return;
    const bundle = UTILITY_BUNDLES[name];
    for (const dependency of bundle.dependsOn ?? []) {
      visit(dependency);
    }
    resolved.add(name);
  }

  for (const name of bundleNames) {
    visit(name);
  }

  return [...resolved];
}

export function detectBundles(
  callbackText: string,
  options: CallbackOptions = {}
): UtilityBundleName[] {
  const required = new Set<UtilityBundleName>(options.forceBundles ?? []);
  const excluded = new Set<UtilityBundleName>(options.excludeBundles ?? []);

  for (const [bundleName, bundle] of Object.entries(UTILITY_BUNDLES) as [
    UtilityBundleName,
    UtilityBundle,
  ][]) {
    if (excluded.has(bundleName)) continue;
    for (const symbol of bundle.symbols) {
      const pattern = new RegExp(`\\b${escapeRegExp(symbol)}\\b`);
      if (pattern.test(callbackText)) {
        required.add(bundleName);
        break;
      }
    }
  }

  return resolveBundleDependencies([...required]).filter((name) => !excluded.has(name));
}

function renderUtilityPrelude(callbackText: string, options: CallbackOptions = {}): string {
  const bundles = detectBundles(callbackText, options);
  if (bundles.length === 0) return '';

  const files = new Set<string>();
  for (const bundleName of bundles) {
    for (const file of UTILITY_BUNDLES[bundleName].files) {
      files.add(file);
    }
  }

  const utilityJs = [...files]
    .map((file) => `// --- Utility source: ${file} ---\n${getTranspiledFile(file)}`)
    .join('\n\n');
  return `// --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---\n${utilityJs}\n// --- END CALLBACK-LOCAL UTILITIES ---`;
}

function withUtilities(callbackText: string, options: CallbackOptions = {}): string {
  const prelude = renderUtilityPrelude(callbackText, options);
  return prelude ? `${prelude}\n\n${callbackText.trim()}` : callbackText.trim();
}

function renderCron(
  name: string,
  schedule: string,
  body: string,
  options: CallbackOptions = {}
): string {
  const fullBody = withUtilities(body, options);
  const isAsync = fullBody.includes('await ');
  const asyncPrefix = isAsync ? 'async ' : '';
  return `cronAdd(${JSON.stringify(name)}, ${JSON.stringify(schedule)}, ${asyncPrefix}() => {\n${indent(fullBody, 4)}\n});`;
}

function renderRecordHook(
  hookName: string,
  collection: string,
  body: string,
  options: CallbackOptions = {}
): string {
  return `${hookName}((e) => {\n${indent(withUtilities(body, options), 4)}\n}, ${JSON.stringify(collection)});`;
}

function renderRoute(
  method: string,
  routePath: string,
  body: string,
  options: CallbackOptions = {}
): string {
  const fullBody = withUtilities(body, options);
  const isAsync = fullBody.includes('await ');
  const asyncPrefix = isAsync ? 'async ' : '';
  return `routerAdd(${JSON.stringify(method)}, ${JSON.stringify(routePath)}, ${asyncPrefix}(e) => {\n${indent(fullBody, 4)}\n});`;
}

function indent(text: string, spaces: number): string {
  const padding = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? `${padding}${line}` : ''))
    .join('\n');
}

function replaceSharedUtilityPlaceholders(js: string): string {
  const placeholder = '// __SHARED_UTILS__';
  let output = '';
  let cursor = 0;

  while (true) {
    const index = js.indexOf(placeholder, cursor);
    if (index === -1) break;
    output += js.slice(cursor, index);
    const body = extractEnclosingArrowBody(js, index);
    output += renderUtilityPrelude(body);
    cursor = index + placeholder.length;
  }

  output += js.slice(cursor);
  return output;
}

function extractEnclosingArrowBody(source: string, position: number): string {
  let openBrace = -1;
  for (let i = position; i >= 0; i--) {
    if (source[i] === '{') {
      openBrace = i;
      break;
    }
  }
  if (openBrace === -1) return source;

  let depth = 0;
  for (let i = openBrace; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) return source.slice(openBrace + 1, i);
  }

  return source.slice(openBrace + 1);
}

function buildRsvpRoutes(): string {
  const files = [
    'rsvp/rsvpHelpers.ts',
    'rsvp/generateRsvpTokens.ts',
    'rsvp/rsvpDetails.ts',
    'rsvp/quickRsvp.ts',
    'rsvp/unsubscribe.ts',
    'rsvp/bulkUpdateRsvps.ts',
    'rsvp/bulkUpsertAttendance.ts',
    'rsvp/resolvePlaceholders.ts',
    'rsvp/singerRsvp.ts',
  ];
  const rsvpJs = files.map((f) => getTranspiledFile(f)).join('\n\n');
  return replaceSharedUtilityPlaceholders(rsvpJs);
}

export function generate(): void {
  const createHookBody = `
try {
    const record = e?.record;
    if (!record) { console.log("[DEBUG] onRecordAfterCreateSuccess: no record"); return; }
    console.log("[DEBUG] onRecordAfterCreateSuccess: id=" + record.id + " status=" + record.get("status") + " type=" + record.get("type"));
    if (record && shouldQueueMessage(record)) {
        enqueueBulkMessage($app, record);
        processEmailQueue($app);
    } else {
        console.log("[DEBUG] onRecordAfterCreateSuccess: shouldQueueMessage returned false for id=" + record.id);
    }
} catch (hookErr) {
    console.log("[Hook Error] onRecordAfterCreateSuccess: " + hookErr);
}`;

  const updateHookBody = `
try {
    const record = e?.record;
    if (!record) { console.log("[DEBUG] onRecordAfterUpdateSuccess: no record"); return; }
    const original = (e.record && typeof e.record.originalCopy === 'function') ? e.record.originalCopy() : e.originalCopy;
    const oldStatus = original ? original.get("status") : "";
    console.log("[DEBUG] onRecordAfterUpdateSuccess: id=" + record.id + " status=" + record.get("status") + " type=" + record.get("type") + " oldStatus=" + oldStatus);
    if (record && shouldQueueMessage(record, oldStatus)) {
        enqueueBulkMessage($app, record);
        processEmailQueue($app);
    } else {
        console.log("[DEBUG] onRecordAfterUpdateSuccess: shouldQueueMessage returned false for id=" + record.id);
    }
} catch (hookErr) {
    console.log("[Hook Error] onRecordAfterUpdateSuccess: " + hookErr);
}`;

  const auditionCreateHookBody = `
try {
    const audition = e?.record;
    if (!audition) return;

    const contact = audition.get("contact") || "";
    const isEmail = contact.includes("@") && contact.includes(".");

    function getChoirTimezone() {
        let timezone = "America/New_York";
        try {
            const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
            if (tzSetting) {
                const tzP = parseJsonField(tzSetting.get("value"));
                if (typeof tzP === "string") {
                    timezone = tzP;
                } else if (typeof tzP === "object" && tzP && tzP.timezone) {
                    timezone = tzP.timezone;
                }
            }
        } catch (err) {}
        return timezone;
    }

    function formatSlotFriendly(slot) {
        if (!slot) return "";
        try {
            const d = new Date(slot);
            if (isNaN(d.getTime())) return slot;

            const timezone = getChoirTimezone();
            const dateStr = formatInTimezone(d, timezone, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = formatInTimezone(d, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
            
            if (dateStr && timeStr) {
                return dateStr + " at " + timeStr;
            }
        } catch (err) {}
        return slot;
    }

    const requestedSlotsRaw = audition.get("requestedSlots");
    const requestedSlots = parseJsonField(requestedSlotsRaw);
    
    let formattedTimeSlots = "Any";
    if (Array.isArray(requestedSlots) && requestedSlots.length > 0) {
        const formattedList = requestedSlots.map(function(slot) {
            return "- " + formatSlotFriendly(slot);
        });
        formattedTimeSlots = "\\n" + formattedList.join("\\n");
    } else {
        const legacySlot = audition.get("scheduledTimeSlot") || audition.get("timeSlot") || "";
        if (legacySlot) {
            formattedTimeSlots = formatSlotFriendly(legacySlot);
        }
    }

    const eventId = audition.get("performance") || "";

    if (isEmail) {
        const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Confirmation' && isSystemTemplate = true");
        if (template) {
            const queueCollection = $app.findCollectionByNameOrId("emailQueue");
            let rawContent = template.get("content") || "";
            rawContent = rawContent.replace(/{timeSlot}/g, formattedTimeSlots);

            const queueRecord = new Record(queueCollection, {
                recipientId: audition.id,
                recipientEmail: contact.trim(),
                recipientName: audition.get("name") || getPerformerLabel(),
                subject: template.get("subject") || "",
                rawContent: rawContent,
                status: "Pending",
                attempts: 0,
                filters: JSON.stringify({ 
                    eventId: eventId, 
                    type: "Automated Confirmation" 
                })
            });

            $app.save(queueRecord);
        }
    }

    // Admin Notification Logic
    try {
        const auditionSettings = $app.findFirstRecordByFilter("appSettings", "key = 'auditions'");
        const settingsParsed = parseJsonField(auditionSettings.get("value"));
        if (settingsParsed && settingsParsed.adminNotifyEnabled && Array.isArray(settingsParsed.adminNotifyUsers) && settingsParsed.adminNotifyUsers.length > 0) {
            let frontendUrl = "http://localhost:5173";
            try {
                const commSetting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
                const commParsed = parseJsonField(commSetting.get("value"));
                if (commParsed && commParsed.frontendUrl) {
                    frontendUrl = commParsed.frontendUrl.replace(/\\/+$/, "");
                }
            } catch (err) {}
            if (frontendUrl === "http://localhost:5173" || !frontendUrl || frontendUrl.indexOf("localhost") !== -1) {
                const meta = $app.settings()?.meta;
                const appSettingsUrl = meta?.appUrl || meta?.appURL || "";
                if (appSettingsUrl) {
                    frontendUrl = appSettingsUrl.replace(/\\/+$/, "");
                }
            }

            let targetPerfName = "None";
            if (eventId) {
                try {
                    const perfRecord = $app.findRecordById("events", eventId);
                    if (perfRecord) {
                        targetPerfName = perfRecord.get("title") || "None";
                    }
                } catch (err) {}
            }

            const cleanSlots = formattedTimeSlots.replace(/\\n/g, "<br/>");
            const adminEmailBody = [
                "<p>A new audition inquiry has been submitted.</p>",
                "<ul>",
                "  <li><strong>Name:</strong> " + escapeHtml(audition.get("name") || "") + "</li>",
                "  <li><strong>Contact:</strong> " + escapeHtml(contact) + "</li>",
                "  <li><strong>Voice Part:</strong> " + escapeHtml(audition.get("voicePart") || "Not specified") + "</li>",
                "  <li><strong>Target Performance:</strong> " + escapeHtml(targetPerfName) + "</li>",
                "  <li><strong>Requested Slots:</strong><br/>" + cleanSlots + "</li>",
                "  <li><strong>Experience:</strong><br/>" + escapeHtml(audition.get("experience") || "None provided").replace(/\\n/g, "<br/>") + "</li>",
                "</ul>",
                "<p><a href=\\"" + frontendUrl + "/admin/auditions\\" style=\\"display:inline-block;padding:10px 16px;background-color:#1b4d3e;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;\\">Review Auditions Dashboard</a></p>"
            ].join("");

            const queueCollection = $app.findCollectionByNameOrId("emailQueue");

            for (let i = 0; i < settingsParsed.adminNotifyUsers.length; i++) {
                const adminId = settingsParsed.adminNotifyUsers[i];
                try {
                    const adminRecord = $app.findRecordById("users", adminId);
                    if (adminRecord && adminRecord.get("email")) {
                        const adminQueueRecord = new Record(queueCollection, {
                            recipientId: adminId,
                            recipientEmail: adminRecord.get("email"),
                            recipientName: adminRecord.get("name") || "Administrator",
                            subject: "New Audition Submission: " + (audition.get("name") || ""),
                            rawContent: adminEmailBody,
                            status: "Pending",
                            attempts: 0,
                            filters: JSON.stringify({
                                auditionId: audition.id,
                                type: "Admin Notification",
                                contentType: "html"
                            })
                            });
                        $app.save(adminQueueRecord);
                    }
                } catch (adminErr) {
                    console.log("[Audition Notification Error] Failed to query admin or save queue: " + adminErr);
                }
            }
        }
    } catch (settingsErr) {
        // Auditions settings not defined/found, or other configuration error
    }

    processEmailQueue($app);
} catch (err) {
    console.log("[Audition Confirmation/Notification Error] Failed to process hooks: " + err);
}`;

  const auditionUpdateHookBody = `
try {
    const audition = e?.record;
    if (!audition) return;

    const currentStatus = audition.get("status");

    if (currentStatus === "Scheduled") {
        const contact = audition.get("contact") || "";
        const isEmail = contact.includes("@") && contact.includes(".");

        if (isEmail) {
            const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Scheduled' && isSystemTemplate = true");
            if (!template) return;

            const eventId = audition.get("performance") || "";
            const timeSlotVal = audition.get("scheduledTimeSlot") || audition.get("timeSlot") || "";
            
            function getChoirTimezone() {
                let timezone = "America/New_York";
                try {
                    const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
                    if (tzSetting) {
                        const tzP = parseJsonField(tzSetting.get("value"));
                        if (typeof tzP === "string") {
                            timezone = tzP;
                        } else if (typeof tzP === "object" && tzP && tzP.timezone) {
                            timezone = tzP.timezone;
                        }
                    }
                } catch (err) {}
                return timezone;
            }

    function getPerformerLabel() {
        try {
            const r = $app.findFirstRecordByFilter("appSettings", "key = 'performer_label'");
            const v = r ? r.get("value") : null;
            if (typeof v === "string" && v.trim()) return v.trim();
        } catch (err) {}
        return "Performer";
    }

    function formatSlotFriendly(slot) {
                if (!slot) return "";
                try {
                    const d = new Date(slot);
                    if (isNaN(d.getTime())) return slot;

                    const timezone = getChoirTimezone();
                    const dateStr = formatInTimezone(d, timezone, { month: 'short', day: 'numeric', year: 'numeric' });
                    const timeStr = formatInTimezone(d, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                    
                    if (dateStr && timeStr) {
                        return dateStr + " at " + timeStr;
                    }
                } catch (err) {}
                return slot;
            }

            const formattedTimeSlot = timeSlotVal ? formatSlotFriendly(timeSlotVal) : "Any";
            
            let rawContent = template.get("content") || "";
            rawContent = rawContent.replace(/{timeSlot}/g, formattedTimeSlot);

            // Check if we already enqueued this scheduled email for this audition to prevent duplicates
            const existing = $app.findRecordsByFilter(
                "emailQueue",
                "recipientId = {:auditionId} && subject = {:subject} && rawContent = {:rawContent}",
                "",
                1,
                0,
                { auditionId: audition.id, subject: template.get("subject") || "", rawContent: rawContent }
            );

            if (existing && existing.length > 0) {
                return; // Email already enqueued
            }

            const queueCollection = $app.findCollectionByNameOrId("emailQueue");
            const queueRecord = new Record(queueCollection, {
                recipientId: audition.id,
                recipientEmail: contact.trim(),
                recipientName: audition.get("name") || getPerformerLabel(),
                subject: template.get("subject") || "",
                rawContent: rawContent,
                status: "Pending",
                attempts: 0,
                filters: JSON.stringify({ 
                    eventId: eventId, 
                    auditionId: audition.id,
                    type: "Automated Confirmation" 
                })
            });

            $app.save(queueRecord);
            processEmailQueue($app);
        }
    }
} catch (err) {
    console.log("[Audition Scheduled Error] Failed to enqueue email: " + err);
}`;

  const queueProcessBody = `
const queryToken = e.requestInfo().query["token"] || "";
let tokenValid = false;

if (queryToken) {
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'QUEUE_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        const secret = parsed && parsed.secret ? parsed.secret : "";
        if (secret && $security.equal(queryToken, secret)) {
            tokenValid = true;
        }
    } catch (err) {
        // Secret not set or record missing
    }
}

const authRecord = e.auth;
const isAdmin = authRecord && authRecord.get("role") === "admin";

if (!tokenValid && !isAdmin) {
    return e.json(403, { error: "Forbidden" });
}

processEmailQueue($app);
return e.json(200, { success: true });`;

  const queueSettingsBody = `
const authRecord = e.auth;
if (!authRecord || authRecord.get("role") !== "admin") {
    return e.json(403, { error: "Forbidden" });
}

let token = "";
try {
    const record = $app.findFirstRecordByFilter("appSettings", "key = 'QUEUE_SECRET'");
    const parsed = parseJsonField(record.get("value"));
    token = parsed && parsed.secret ? parsed.secret : "";
} catch (err) {
    // Record does not exist yet
}

return e.json(200, { secret: token });`;

  const queueSettingsGenerateBody = `
const authRecord = e.auth;
if (!authRecord || authRecord.get("role") !== "admin") {
    return e.json(403, { error: "Forbidden" });
}

const newSecret = $security.randomString(32);
const valueObj = { secret: newSecret };

let record;
try {
    record = $app.findFirstRecordByFilter("appSettings", "key = 'QUEUE_SECRET'");
    record.set("value", JSON.stringify(valueObj));
} catch (err) {
    const collection = $app.findCollectionByNameOrId("appSettings");
    record = new Record(collection, {
        key: "QUEUE_SECRET",
        value: JSON.stringify(valueObj)
    });
}

$app.save(record);
return e.json(200, { secret: newSecret });`;

  const testSmtpBody = `
const authRecord = e.auth;
if (!authRecord || authRecord.get("role") !== "admin") return e.json(403, { error: "Forbidden" });
const { email } = e.requestInfo().body;
if (!email) return e.json(400, { error: "Missing email" });

let provider = 'smtp';
let brevoApiKey = '';

try {
    const provRecord = $app.findFirstRecordByFilter('appSettings', "key = 'email_provider'");
    const provConfig = parseJsonField(provRecord.get('value'));
    if (provConfig) {
        if (provConfig.provider === 'brevo' && provConfig.brevoApiKey) {
            provider = 'brevo';
            brevoApiKey = provConfig.brevoApiKey;
        }
    }
} catch (e) {
    // Default to SMTP
}

const settings = $app.settings();

const saveEmailVerification = function(success, prov) {
    try {
        let evidenceRecord = null;
        try {
            evidenceRecord = $app.findFirstRecordByFilter('appSettings', "key = 'email_verification'");
        } catch (e) {
            const appSettingsColl = $app.findCollectionByNameOrId('appSettings');
            evidenceRecord = new Record(appSettingsColl, { key: 'email_verification' });
        }
        evidenceRecord.set('value', JSON.stringify({
            provider: prov,
            checkedAt: new Date().toISOString(),
            success: success,
        }));
        $app.save(evidenceRecord);
    } catch (e) {
        // ignore
    }
};

if (provider === 'brevo') {
    try {
        dispatchEmailViaBrevo(brevoApiKey, {
            senderName: settings.meta.senderName || "Choir Management Tool",
            senderAddress: settings.meta.senderAddress || "no-reply@choir.management",
            recipientName: "Admin Test",
            recipientEmail: email,
            subject: "Brevo Test Successful!",
            htmlContent: "<p>Your Brevo API Email integration is working!</p>",
            textContent: "Your Brevo API Email integration is working!"
        });
        saveEmailVerification(true, 'brevo');
        return e.json(200, { success: true });
    } catch (err) {
        saveEmailVerification(false, 'brevo');
        return e.json(500, { error: "Brevo API failed: " + (err instanceof Error ? err.message : String(err)) });
    }
} else {
    if (!settings.smtp.enabled) {
        saveEmailVerification(false, 'smtp');
        return e.json(400, { error: "SMTP disabled" });
    }
    try {
        const message = new MailerMessage({ 
            from: { address: settings.meta.senderAddress || "no-reply@choir.management", name: "Choir Management Tool" }, 
            to: [{ address: email }], 
            subject: "SMTP Test Successful!", 
            html: "<p>Your SMTP is working!</p>" 
        });
        $app.newMailClient().send(message);
        saveEmailVerification(true, 'smtp');
        return e.json(200, { success: true });
    } catch (err) { 
        saveEmailVerification(false, 'smtp');
        return e.json(500, { error: "SMTP failed" }); 
    }
}`;

  const testSmsBody = `
const phone = e.requestInfo().query["phone"] || (e.requestInfo().body ? e.requestInfo().body.phone : "");
if (!phone) return e.json(400, { error: "Missing phone" });

let provider = 'smtp';
let brevoApiKey = '';

try {
    const provRecord = $app.findFirstRecordByFilter('appSettings', "key = 'email_provider'");
    const provConfig = parseJsonField(provRecord.get('value'));
    if (provConfig) {
        if (provConfig.provider === 'brevo' && provConfig.brevoApiKey) {
            provider = 'brevo';
            brevoApiKey = provConfig.brevoApiKey;
        }
    }
} catch (e) {
    // Default to SMTP
}

const settings = $app.settings();

let formattedPhone = phone.replace(/\D/g, '');
if (formattedPhone) {
    try {
        const commSettingRec = $app.findFirstRecordByFilter('appSettings', "key = 'communications'");
        const commSettings = parseJsonField(commSettingRec?.get('value')) || {};
        const defaultCode = commSettings.defaultCountryCode || '1';
        
        if (formattedPhone.length === 10 && defaultCode === '1') {
            formattedPhone = defaultCode + formattedPhone;
        } else if (!formattedPhone.startsWith(defaultCode) && formattedPhone.length <= 10) {
            formattedPhone = defaultCode + formattedPhone;
        }
    } catch (e) {
        // Ignore missing setting
    }
} else {
    formattedPhone = phone;
}

if (provider === 'brevo') {
    try {
        dispatchSmsViaBrevo(brevoApiKey, {
            senderName: settings.meta.senderName || "Choir Management Tool",
            recipientPhone: formattedPhone,
            content: "Your Brevo API SMS integration is working!"
        });
        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { error: "Brevo SMS API failed: " + (err instanceof Error ? err.message : String(err)) });
    }
} else {
    if (!settings.smtp.enabled) return e.json(400, { error: "SMTP disabled" });
    try {
        const message = new MailerMessage({ 
            from: { address: settings.meta.senderAddress || "no-reply@choir.management", name: "Choir Management Tool" }, 
            to: [{ address: formattedPhone + '@sms.smtp2go.com' }], 
            subject: "", 
            text: "Your SMTP-to-SMS integration is working!" 
        });
        $app.newMailClient().send(message);
        return e.json(200, { success: true });
    } catch (err) { 
        return e.json(500, { error: "SMTP SMS failed" }); 
    }
}
`;

  const collectionModuleGuards: Record<string, string> = {
    eventRosters: 'rsvps',
    donations: 'donations',
    ticketPurchases: 'ticketSales',
    ticketBundles: 'ticketSales',
    tickets: 'ticketSales',
    musicPieces: 'musicLibrary',
    resources: 'resources',
    auditions: 'auditions',
    polls: 'polls',
    pollVotes: 'polls',
    messages: 'communications',
    seatingProfiles: 'seating',
    seatingCharts: 'seating',
    events: 'events',
    venues: 'events',
    attendance: 'attendance',
    setLists: 'setLists',
    patrons: 'patrons',
    seasons: 'roster',
  };

  const beforeRequestHookNames = [
    'onRecordCreateRequest',
    'onRecordUpdateRequest',
    'onRecordDeleteRequest',
    'onRecordViewRequest',
    'onRecordsListRequest',
  ];

  const beforeRequestHooks = beforeRequestHookNames
    .map((hookName) => {
      return Object.entries(collectionModuleGuards)
        .map(([collection, module]) => {
          const body = `
if (!isBackendModuleEnabled($app, ${JSON.stringify(module)})) {
    throw new NotFoundError("Forbidden: Module ${module} is disabled");
}`;
          return renderRecordHook(hookName, collection, body, {
            forceBundles: ['setup'],
          });
        })
        .join('\n\n');
    })
    .join('\n\n');

  const mainPbJs = `
// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)
// Source: pocketbase/pb_hooks_src/

// --- ENV POLYFILL FOR GOJA ---
if (typeof process === 'undefined') {
    globalThis.process = {
        env: new Proxy({}, {
            get: (target, prop) => typeof prop === 'string' ? os.getenv(prop) : undefined
        })
    };
}

// --- RECORD HOOKS ---

${beforeRequestHooks}

${renderRecordHook('onRecordAfterCreateSuccess', 'messages', createHookBody)}

${renderRecordHook('onRecordAfterUpdateSuccess', 'messages', updateHookBody)}

${renderRecordHook('onRecordAfterCreateSuccess', 'auditions', auditionCreateHookBody)}

${renderRecordHook('onRecordAfterUpdateSuccess', 'auditions', auditionUpdateHookBody)}

// --- CUSTOM ENDPOINTS ---

routerUse((e) => {
    const path = e.request.url.path;
    const routeModuleGuards = {
        '/api/generate-rsvp-tokens': 'rsvps',
        '/api/rsvp-details': 'rsvps',
        '/api/quick-rsvp': 'rsvps',
        '/api/unsubscribe': 'rsvps',
        '/api/admin/bulk-update-rsvps': 'rsvps',
        '/api/singer/resolve-placeholders': 'rsvps',
        '/api/singer/rsvp': 'rsvps',
        '/api/admin/bulk-upsert-attendance': 'attendance',
        '/api/generate-poll-tokens': 'polls',
        '/api/poll-details': 'polls',
        '/api/submit-poll-response': 'polls',
        '/api/generate-player-token': 'musicLibrary',
        '/api/player-playlist': 'musicLibrary',
        '/api/singer/player-playlist': 'musicLibrary',
        '/api/calendar/download': 'events',
        '/api/calendar/feed': 'events',
        '/api/singer/calendar-feed-url': 'events',
        '/api/singer/calendar-feed-url/reset': 'events',
        '/api/singer/seating-profiles': 'seating',
        '/api/checkout/create-tickets-session': 'ticketSales',
        '/api/checkout/create-bundle-session': 'ticketSales',
        '/api/admin/refund-ticket': 'ticketSales',
        '/api/admin/refund-bundle': 'ticketSales',
        '/api/admin/resend-ticket-confirmation': 'ticketSales',
        '/api/tickets/validate': 'ticketSales',
        '/api/tickets/scan-context': 'ticketSales',
        '/api/checkout/create-donation-session': 'donations',
        '/api/admin/refund-donation': 'donations'
    };

    for (const route in routeModuleGuards) {
        if (path === route || path.indexOf(route + '/') === 0) {
            const module = routeModuleGuards[route];
            if (!isBackendModuleEnabled($app, module)) {
                throw new NotFoundError("Forbidden: Module " + module + " is disabled");
            }
        }
    }
    return e.next();
});

${renderRoute('GET', '/api/setup/status', 'return handleSetupStatus(e);')}
${renderRoute('POST', '/api/setup/claim', 'return handleSetupClaim(e);')}
${renderRoute('POST', '/api/setup/progress', 'return handleSetupProgress(e);')}
${renderRoute('POST', '/api/setup/complete', 'return handleSetupComplete(e);')}
${renderRoute('POST', '/api/setup/recover-admin', 'return handleAdminRecovery(e);')}
${renderRoute('GET', '/api/setup/health', 'return handleSetupHealth(e);')}

${buildRsvpRoutes()}

${renderRoute('POST', '/api/queue/process', queueProcessBody)}

${renderRoute('GET', '/api/admin/queue-settings', queueSettingsBody)}

${renderRoute('POST', '/api/admin/queue-settings/generate', queueSettingsGenerateBody)}

${renderRoute('POST', '/api/test-smtp', testSmtpBody)}
${renderRoute('POST', '/api/test-sms', testSmsBody)}

${renderRoute('POST', '/api/generate-player-token', 'return handleGeneratePlayerToken(e);')}

${renderRoute('POST', '/api/checkout/create-tickets-session', 'return handleCreateTicketsSession(e);')}

${renderRoute('POST', '/api/checkout/create-bundle-session', 'return handleCreateBundleSession(e);')}

${renderRoute('POST', '/api/checkout/create-donation-session', 'return handleCreateDonationSession(e);')}

${renderRoute('POST', '/api/webhook/stripe', 'return handleStripeWebhook(e);')}

${renderRoute('POST', '/api/admin/refund-ticket', 'return handleAdminRefundTicket(e);')}

${renderRoute('POST', '/api/admin/refund-bundle', 'return handleAdminRefundBundle(e);')}

${renderRoute('POST', '/api/admin/refund-donation', 'return handleAdminRefundDonation(e);')}
${renderRoute('POST', '/api/admin/resend-ticket-confirmation', 'return handleAdminResendTicketConfirmation(e);')}

${renderRoute('POST', '/api/tickets/validate', 'return handleValidateScan(e);')}

${renderRoute('GET', '/api/tickets/scan-context', 'return handleGetScanContext(e);')}

${renderRoute('GET', '/api/player-playlist', 'return handlePlayerPlaylist(e);')}

${renderRoute('GET', '/api/calendar/download', 'return handleCalendarDownload(e);')}

${renderRoute('GET', '/api/calendar/feed', 'return handleCalendarFeed(e);')}

${renderRoute('GET', '/api/singer/calendar-feed-url', 'return handleCalendarFeedUrl(e);')}

${renderRoute('POST', '/api/singer/calendar-feed-url/reset', 'return handleCalendarFeedReset(e);')}

${renderRoute('GET', '/api/singer/seating-profiles', 'return handleSingerSeatingProfiles(e);')}

${renderRoute('GET', '/api/singer/player-playlist', 'return handleSingerPlayerPlaylist(e);')}

${renderRoute(
  'GET',
  '/api/maintenance/run',
  `
if (!isMaintenanceRequestAuthorized(e, $app)) {
  return e.json(403, { error: "Forbidden" });
}
const summary = runMaintenance($app);
return e.json(200, { success: true, summary });
`
)}
`.trim();

  fs.writeFileSync(OUTPUT_FILE, `${mainPbJs}\n`);
  console.log('Successfully generated pocketbase/pb_hooks/main.pb.js');
}

function isMainModule(): boolean {
  try {
    return (
      process.argv[1] === fileURLToPath(import.meta.url) ||
      process.argv[1]?.endsWith('generate-main-pb-js.ts')
    );
  } catch {
    return false;
  }
}

if (isMainModule()) {
  generate();
}
