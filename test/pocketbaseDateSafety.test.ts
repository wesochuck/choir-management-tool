import assert from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'pocketbase/pb_hooks_src');

const dateishGetRegex =
  /\.get\(['"][^'"]*(date|Date|created|updated|At|Time|fulfilledAt|saleEndDate|reminderSentAt|reportSentAt)[^'"]*['"]\)/;

const allowlist = new Set([
  // playerEndpoints: returns raw Date values in JSON — PocketBase serializes Dates to ISO strings
  'playerEndpoints.ts',
  // attendanceFinalizer: only reads type and parentPerformanceId, not datetime values for comparison
  'attendanceFinalizer.ts',
  // generate-main-pb-js.ts: Node.js build script, not a Goja hook. References coercePocketBaseDate in
  // template strings that generate Goja code, but does not import it (build-time only).
  'generate-main-pb-js.ts',
  // resolvePlaceholders.ts and rsvpDetails.ts: pass raw event.get("date") to formatInTimezone
  // (accepts Date|string) or return dates in JSON responses where PocketBase serialization is correct.
  'resolvePlaceholders.ts',
  'rsvpDetails.ts',
  // rsvpValidation.ts: contains parsePocketBaseDate() — its own date safety helper (precedes the shared one)
  'rsvpValidation.ts',
  // ticketScan/ticketValidation.ts: uses String(event.get('date') || '') which is safe for Goja
  'ticketValidation.ts',
]);

function walk(dir: string, files: string[] = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(ts|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('PocketBase datetime safety', () => {
  it('uses coercePocketBaseDate or is allowlisted in hook files that access datetime-like fields', () => {
    const offenders: string[] = [];

    for (const file of walk(root)) {
      const relativePath = path.relative(process.cwd(), file);
      const text = fs.readFileSync(file, 'utf8');

      if (!dateishGetRegex.test(text)) continue;
      if (relativePath.endsWith('pocketbaseDate.ts')) continue;
      if (allowlist.has(path.basename(relativePath))) continue;

      const importsDateHelper =
        text.includes("from './pocketbaseDate'") ||
        text.includes('from "./pocketbaseDate"') ||
        text.includes("from '../pocketbaseDate'") ||
        text.includes('from "../pocketbaseDate"');

      const usesDateHelper = text.includes('coercePocketBaseDate(');

      if (!importsDateHelper || !usesDateHelper) {
        offenders.push(relativePath);
      }
    }

    assert.deepEqual(
      offenders,
      [],
      [
        'PocketBase hook files that access datetime-like fields should use coercePocketBaseDate().',
        'Either update the file to use the helper or add a narrow allowlist entry with a comment explaining why.',
        ...offenders.map((file) => `- ${file}`),
      ].join('\n')
    );
  });
});
