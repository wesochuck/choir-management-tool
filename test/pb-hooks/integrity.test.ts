import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  transpileHookSource,
  UTILITY_BUNDLES,
  type UtilityBundleName,
} from '../../pocketbase/pb_hooks_src/generate-main-pb-js.ts';

function countOccurrences(str: string, needle: string): number {
  return str.split(needle).length - 1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countRouteRegistrations(content: string, method: string, routePath: string): number {
  const regex = new RegExp(
    `routerAdd\\(\\s*['"]${escapeRegExp(method)}['"]\\s*,\\s*['"]${escapeRegExp(routePath)}['"]`,
    'g'
  );

  return [...content.matchAll(regex)].length;
}

function readGeneratedMain(): string {
  const mainPath = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');
  return fs.readFileSync(mainPath, 'utf8');
}

function extractCallbackAfterMarker(
  content: string,
  markerIndex: number,
  endMarker: string,
  label: string
): string {
  assert.notStrictEqual(markerIndex, -1, `Expected generated file to contain ${label}`);

  const callbackStart = content.indexOf('=> {', markerIndex);
  assert.notStrictEqual(
    callbackStart,
    -1,
    `Expected ${label} registration to use an arrow callback`
  );
  const openBrace = content.indexOf('{', callbackStart);
  const registrationEnd = content.indexOf(endMarker, openBrace);
  assert.notStrictEqual(registrationEnd, -1, `Could not find registration end for ${label}`);

  return content.slice(openBrace + 1, registrationEnd);
}

function extractRouteCallback(content: string, routePath: string): string {
  const pathIndex = content.indexOf(`"${routePath}"`);
  return extractCallbackAfterMarker(content, pathIndex, '\n});', routePath);
}

function extractCronCallback(content: string, cronName: string): string {
  const markerIndex = content.indexOf(`cronAdd("${cronName}"`);
  return extractCallbackAfterMarker(content, markerIndex, '\n});', cronName);
}

function extractRecordHookCallback(
  content: string,
  hookName: string,
  collectionName: string
): string {
  const hookMarker = `${hookName}((`;
  const endMarker = `\n}, "${collectionName}");`;

  let startIdx = -1;
  let cursor = 0;
  while (true) {
    const foundIdx = content.indexOf(hookMarker, cursor);
    if (foundIdx === -1) break;

    const nextEnd = content.indexOf(endMarker, foundIdx);
    if (nextEnd !== -1) {
      const nextHook = content.indexOf(hookMarker, foundIdx + hookMarker.length);
      if (nextHook === -1 || nextHook > nextEnd) {
        startIdx = foundIdx;
        break;
      }
    }
    cursor = foundIdx + hookMarker.length;
  }

  assert.notStrictEqual(
    startIdx,
    -1,
    `Could not find registration for ${hookName} on ${collectionName}`
  );
  return extractCallbackAfterMarker(
    content,
    startIdx,
    endMarker,
    `${hookName} for ${collectionName}`
  );
}

test('Generated main.pb.js integrity', () => {
  const content = readGeneratedMain();

  assert.ok(
    content.startsWith('// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)'),
    'Should contain generated output marker'
  );
  assert.ok(!content.includes('cronAdd('), 'Should contain zero cron registrations');
  assert.ok(content.includes('onRecordAfterCreateSuccess'), 'Should contain create hook');
  assert.ok(content.includes('onRecordAfterUpdateSuccess'), 'Should contain update hook');
  assert.ok(
    countRouteRegistrations(content, 'POST', '/api/queue/process') === 1,
    'Should contain queue process route'
  );
  assert.ok(
    countRouteRegistrations(content, 'POST', '/api/test-smtp') === 1,
    'Should contain test-smtp route'
  );
  assert.ok(content.includes('shouldQueueMessage'), 'Should utilize shouldQueueMessage check');
  assert.ok(content.includes('enqueueBulkMessage'), 'Should utilize enqueueBulkMessage explosion');
  assert.ok(content.includes('role") !== "admin"'), 'Should preserve admin-only route protection');
  assert.ok(
    content.includes('"/api/generate-player-token"'),
    'Should include player endpoint route'
  );
  assert.ok(content.includes('"/api/player-playlist"'), 'Should include player playlist route');
  assert.ok(
    content.includes('"/api/singer/player-playlist"'),
    'Should include singer player playlist route'
  );

  assert.strictEqual(
    countOccurrences(content, 'routerAdd('),
    38,
    'Generated main file should contain exactly 38 route registrations'
  );
  assert.strictEqual(
    countOccurrences(content, 'cronAdd('),
    0,
    'Generated main file should contain exactly 0 cron registrations'
  );
  assert.strictEqual(
    countOccurrences(content, 'onRecordAfterCreateSuccess(('),
    2,
    'Generated main file should contain exactly two create hook registrations'
  );
  assert.strictEqual(
    countOccurrences(content, 'onRecordAfterUpdateSuccess(('),
    2,
    'Generated main file should contain exactly two update hook registrations'
  );

  const requiredRoutes = [
    ['POST', '/api/generate-rsvp-tokens'],
    ['POST', '/api/rsvp-details'],
    ['POST', '/api/quick-rsvp'],
    ['POST', '/api/unsubscribe'],
    ['POST', '/api/admin/bulk-update-rsvps'],
    ['POST', '/api/admin/bulk-upsert-attendance'],
    ['POST', '/api/singer/resolve-placeholders'],
    ['POST', '/api/singer/rsvp'],
    ['POST', '/api/admin/resend-ticket-confirmation'],
    ['GET', '/api/setup/status'],
    ['POST', '/api/setup/claim'],
    ['POST', '/api/setup/progress'],
    ['POST', '/api/setup/complete'],
    ['POST', '/api/setup/recover-admin'],
    ['GET', '/api/setup/health'],
  ] as const;

  for (const [method, routePath] of requiredRoutes) {
    assert.strictEqual(
      countRouteRegistrations(content, method, routePath),
      1,
      `Generated main file should contain exactly one registration for ${method} ${routePath}`
    );
  }
});

test('Generated main.pb.js uses callback-local bundles without top-level shared utilities', () => {
  const content = readGeneratedMain();

  assert.ok(
    !content.includes('// --- SHARED UTILITIES ---'),
    'Generated file should not emit the old top-level sharedUtils block'
  );
  assert.ok(
    !content.includes('__SHARED_UTILS__'),
    'Generated file should not leak generator utility placeholders'
  );
  assert.strictEqual(
    countOccurrences(content, 'CALLBACK-LOCAL UTILITIES'),
    116,
    'Generated file should contain exactly 116 callback-local utility regions'
  );

  const filePrelude = content.slice(0, content.indexOf('// --- RECORD HOOKS ---'));
  assert.ok(
    !filePrelude.includes('function '),
    'Generated file prelude should not contain top-level helper functions'
  );

  const queueRoute = extractRouteCallback(content, '/api/queue/process');
  assert.ok(
    queueRoute.includes('function processEmailQueue'),
    'Queue process callback should contain the email queue processor it calls'
  );
  assert.ok(
    queueRoute.includes('function parseJsonField'),
    'Queue process callback should contain JSON parsing utilities it calls'
  );
  assert.ok(
    !queueRoute.includes('function handleSingerSeatingProfiles'),
    'Queue process callback should not contain unrelated seating endpoint utilities'
  );

  const seatingRoute = extractRouteCallback(content, '/api/singer/seating-profiles');
  assert.ok(
    seatingRoute.includes('function handleSingerSeatingProfiles'),
    'Seating route should contain its endpoint implementation'
  );
  assert.ok(
    seatingRoute.includes('function parseJsonField'),
    'Seating route should contain JSON parsing dependency'
  );
  assert.ok(
    !seatingRoute.includes('function processEmailQueue'),
    'Seating route should not contain unrelated queue processor utilities'
  );

  const testSmtpRoute = extractRouteCallback(content, '/api/test-smtp');
  assert.ok(
    testSmtpRoute.includes('CALLBACK-LOCAL UTILITIES'),
    'SMTP test route should include utility bundle because it calls dispatchEmailViaBrevo'
  );
  assert.ok(
    testSmtpRoute.includes('function dispatchEmailViaBrevo'),
    'SMTP test route should contain dispatchEmailViaBrevo helper'
  );

  const maintenanceRoute = extractRouteCallback(content, '/api/maintenance/run');
  assert.ok(
    maintenanceRoute.includes('function isMaintenanceRequestAuthorized'),
    'Maintenance route should contain auth utility'
  );
  assert.ok(
    maintenanceRoute.includes('function runMaintenance'),
    'Maintenance route should contain runner'
  );
  assert.ok(
    maintenanceRoute.includes('function runPostEventReportTask'),
    'Maintenance route should contain post-event report task'
  );
  assert.ok(
    maintenanceRoute.includes('function runTicketBuyerReminderTask'),
    'Maintenance route should contain ticket buyer reminder task'
  );
  assert.ok(
    maintenanceRoute.includes('function runCleanupTask'),
    'Maintenance route should contain cleanup task'
  );
  assert.ok(
    maintenanceRoute.includes('function runEmailQueueTask'),
    'Maintenance route should contain email queue task'
  );
  assert.ok(
    maintenanceRoute.includes('function getMaintenanceState'),
    'Maintenance route should contain state helpers'
  );
  assert.ok(
    maintenanceRoute.includes('function isTaskDue'),
    'Maintenance route should contain isTaskDue'
  );
  assert.ok(
    maintenanceRoute.includes('function hasActiveLock'),
    'Maintenance route should contain hasActiveLock'
  );
  assert.ok(
    maintenanceRoute.includes('function tryAcquireTaskLock'),
    'Maintenance route should contain tryAcquireTaskLock'
  );
  assert.ok(
    maintenanceRoute.includes('function releaseTaskLock'),
    'Maintenance route should contain releaseTaskLock'
  );

  const createMessagesHook = extractRecordHookCallback(
    content,
    'onRecordAfterCreateSuccess',
    'messages'
  );
  assert.ok(
    createMessagesHook.includes('function shouldQueueMessage'),
    'Create messages hook should contain queue eligibility utility'
  );
  assert.ok(
    createMessagesHook.includes('function enqueueBulkMessage'),
    'Create messages hook should contain bulk enqueue utility'
  );
  assert.ok(
    createMessagesHook.includes('function parseJsonField'),
    'Create messages hook should contain JSON parsing dependency'
  );
  assert.ok(
    !createMessagesHook.includes('function handleCalendarDownload'),
    'Create messages hook should not contain unrelated calendar endpoint utilities'
  );

  const updateMessagesHook = extractRecordHookCallback(
    content,
    'onRecordAfterUpdateSuccess',
    'messages'
  );
  assert.ok(
    updateMessagesHook.includes('function shouldQueueMessage'),
    'Update messages hook should contain queue eligibility utility'
  );
  assert.ok(
    updateMessagesHook.includes('function enqueueBulkMessage'),
    'Update messages hook should contain bulk enqueue utility'
  );
  assert.ok(
    updateMessagesHook.includes('function parseJsonField'),
    'Update messages hook should contain JSON parsing dependency'
  );
  assert.ok(
    !updateMessagesHook.includes('function handleSingerSeatingProfiles'),
    'Update messages hook should not contain unrelated seating endpoint utilities'
  );

  const createAuditionsHook = extractRecordHookCallback(
    content,
    'onRecordAfterCreateSuccess',
    'auditions'
  );
  assert.ok(
    createAuditionsHook.includes('function processEmailQueue'),
    'Create auditions hook should contain processEmailQueue'
  );
  assert.ok(
    createAuditionsHook.includes('function parseJsonField'),
    'Create auditions hook should contain parseJsonField'
  );

  const updateAuditionsHook = extractRecordHookCallback(
    content,
    'onRecordAfterUpdateSuccess',
    'auditions'
  );
  assert.ok(
    updateAuditionsHook.includes('function processEmailQueue'),
    'Update auditions hook should contain processEmailQueue'
  );
  assert.ok(
    updateAuditionsHook.includes('function parseJsonField'),
    'Update auditions hook should contain parseJsonField'
  );

  const generatePlayerTokenRoute = extractRouteCallback(content, '/api/generate-player-token');
  assert.ok(
    generatePlayerTokenRoute.includes('function handleGeneratePlayerToken'),
    'Generate player token route should contain its handler'
  );
  assert.ok(
    generatePlayerTokenRoute.includes('function generateSignedPlayerToken'),
    'Generate player token route should contain token generator'
  );

  const playerPlaylistRoute = extractRouteCallback(content, '/api/player-playlist');
  assert.ok(
    playerPlaylistRoute.includes('function handlePlayerPlaylist'),
    'Player playlist route should contain its handler'
  );
  assert.ok(
    playerPlaylistRoute.includes('function getHmacSecret'),
    'Player playlist route should contain secret retriever'
  );
});

test('post_event_report subject templating inserts dynamic values literally', () => {
  const content = readGeneratedMain();
  const maintenanceRoute = extractRouteCallback(content, '/api/maintenance/run');

  assert.ok(
    maintenanceRoute.includes("const eventTitle = String(event.get('title') || '');"),
    'Attendance report task should normalize event title before template replacement'
  );
  assert.ok(
    maintenanceRoute.includes('.replace(/{eventTitle}/g, () => eventTitle)'),
    'Attendance report task should use a functional replacer for eventTitle'
  );
  assert.ok(
    maintenanceRoute.includes('.replace(/{eventDate}/g, () => eventDateStr)'),
    'Attendance report task should use a functional replacer for eventDate'
  );
  assert.ok(
    !maintenanceRoute.includes(".replace(/{eventTitle}/g, event.get('title'))"),
    'Attendance report task should not use a dynamic replacement string for eventTitle'
  );
});

test('Generated main.pb.js does not leak module syntax', () => {
  const content = readGeneratedMain();
  const leakedModuleSyntax = content
    .split('\n')
    .filter((line) => /^\s*(import|export)\b|exports\./.test(line));

  assert.deepStrictEqual(
    leakedModuleSyntax,
    [],
    'Generated file should not contain import/export syntax or CommonJS export assignments'
  );
});

test('Hook source transpilation safely strips multi-line imports and exports', () => {
  const source = `
import defaultThing, {
    namedThing,
    anotherThing as renamedThing,
} from './dependency';
import type {
    SomeType,
} from './types';
import './side-effect';

export interface ExampleShape {
    name: string;
}

export const namedValue: SomeType = namedThing;

export function helper(input: string): string {
    return renamedThing(input);
}

export default function defaultHelper(): string {
    return defaultThing();
}

export {
    helper as renamedHelper,
    namedValue,
};
`;

  const output = transpileHookSource(source, 'fixture.ts');

  assert.ok(
    output.includes('const namedValue'),
    'Named value export should become a plain script const'
  );
  assert.ok(
    output.includes('function helper'),
    'Named function export should become a plain script function'
  );
  assert.ok(
    output.includes('function defaultHelper'),
    'Default function export should become a plain script function'
  );
  assert.ok(!/^\s*import\b/m.test(output), 'Single-line and multi-line imports should be removed');
  assert.ok(!/^\s*export\b/m.test(output), 'Named/default/re-export syntax should be removed');
  assert.ok(!/exports\./.test(output), 'CommonJS export assignments should not be emitted');
});

test('Generated main.pb.js has no unbalanced forEach in post_event_report task', () => {
  const mainPath = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');
  const content = fs.readFileSync(mainPath, 'utf8');

  const maintenanceRoute = extractRouteCallback(content, '/api/maintenance/run');
  const forEachOpens = (maintenanceRoute.match(/\.forEach\(/g) || []).length;
  const forEachCloses = (maintenanceRoute.match(/\);/g) || []).length;
  assert.ok(
    forEachCloses >= forEachOpens,
    `post_event_report task has unbalanced forEach calls: ${forEachOpens} opens but ${forEachCloses} closes. Check for extra/missing brackets in attendance report template.`
  );
});

test('Generated main.pb.js is structurally valid Goja-compatible JavaScript', () => {
  const mainPath = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');
  const content = fs.readFileSync(mainPath, 'utf8');

  // Strip await keyword first — Goja allows await in callback contexts where
  // standard JS doesn't. After stripping, the file should parse cleanly with
  // strict ES2022 syntax (no top-level await allowed).
  const stripped = content.replace(/\bawait\s+/g, '/*await*/');
  const acorn = require('acorn');
  try {
    acorn.parse(stripped, {
      ecmaVersion: 2022,
      sourceType: 'script',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const loc = (e as { loc?: { line: number; column: number } }).loc;
    const lineInfo = loc ? ` at line ${loc.line}:${loc.column}` : '';
    assert.fail(
      `Generated main.pb.js has a JavaScript syntax error${lineInfo}: ${msg}. ` +
        `This will cause Goja to fail loading the hooks. Check cron/route templates in generate-main-pb-js.ts.`
    );
  }
});

test('Generated main.pb.js uses async callbacks when body has await', () => {
  const content = readGeneratedMain();
  const lines = content.split('\n');

  // 1. No cron registrations (maintenance is now PocketHost-triggered)
  assert.ok(!content.includes('cronAdd('), 'No cron registrations should remain');

  // 2. Check all router registrations — verify routes using await are async
  const routeMatches = content.matchAll(
    /routerAdd\("([A-Z]+)",\s*"([^"]+)",\s*((?:async\s*)?\([^)]*\)\s*=>\s*\{)/g
  );
  if (routeMatches) {
    for (const match of routeMatches) {
      const routePath = match[2];
      const callbackOpen = match[3];
      const callbackBody = extractRouteCallback(content, routePath);
      const usesAwait = callbackBody.includes('await ');
      if (usesAwait && !callbackOpen.startsWith('async ')) {
        assert.fail(
          `Route ${routePath} uses await in its body but lacks async keyword on callback.`
        );
      }
    }
  }

  // 3. Check all function declarations in source files — verify functions using await are async
  //    Check source files directly (more reliable than parsing the generated file
  //    which has regex literals that confuse brace matching)
  const srcDir = path.join(process.cwd(), 'pocketbase/pb_hooks_src');
  function walkSrcDir(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) results.push(...walkSrcDir(full));
        else if (entry.isFile() && entry.name.endsWith('.ts')) results.push(full);
      }
    } catch {}
    return results;
  }

  const srcFiles = walkSrcDir(srcDir);
  for (const srcFile of srcFiles) {
    if (srcFile.endsWith('generate-main-pb-js.ts')) continue;
    const srcContent = fs.readFileSync(srcFile, 'utf8');

    // Find all function declarations (sync, not async)
    const funcDeclRegex = /^(?:export\s+)?function\s+(\w+)\s*\([^)]*\)\s*:\s*\w+/gm;
    let funcMatch: RegExpExecArray | null;
    while ((funcMatch = funcDeclRegex.exec(srcContent)) !== null) {
      const funcName = funcMatch[1];
      // Check if this function has 'async' somewhere before its name (the source uses TypeScript async)
      const matchStart = srcContent.lastIndexOf('\n', funcMatch.index) + 1;
      const beforeFunc = srcContent.slice(Math.max(0, matchStart - 10), matchStart);
      if (beforeFunc.includes('async ')) continue;

      // Find the opening brace of the function body
      const afterParams = srcContent.indexOf('{', funcMatch.index + funcMatch[0].length);
      if (afterParams === -1) continue;

      // Count braces to find the matching close
      let depth = 1;
      let pos = afterParams + 1;
      while (depth > 0 && pos < srcContent.length) {
        if (srcContent[pos] === '/' && srcContent[pos + 1] === '/') {
          const nextNl = srcContent.indexOf('\n', pos);
          pos = nextNl === -1 ? srcContent.length : nextNl + 1;
          continue;
        }
        if (srcContent[pos] === '/' && srcContent[pos + 1] === '*') {
          const endComment = srcContent.indexOf('*/', pos);
          pos = endComment === -1 ? srcContent.length : endComment + 2;
          continue;
        }
        if (srcContent[pos] === '"' || srcContent[pos] === "'" || srcContent[pos] === '`') {
          const quote = srcContent[pos];
          pos++;
          while (pos < srcContent.length && srcContent[pos] !== quote) {
            if (srcContent[pos] === '\\') pos++;
            pos++;
          }
          pos++;
          continue;
        }
        if (srcContent[pos] === '{') depth++;
        if (srcContent[pos] === '}') depth--;
        pos++;
      }
      const body = srcContent.slice(afterParams, pos - 1);
      if (body.includes('await ')) {
        const lineNum = srcContent.substring(0, funcMatch.index).split('\n').length;
        assert.fail(
          `Function ${funcName} in ${path.relative(process.cwd(), srcFile)} (line ${lineNum}) uses await but is not declared async. Add 'async' keyword.`
        );
      }
    }
  }
});

test('Manual pb_hooks self-containment validation', () => {
  const hooksDir = path.join(process.cwd(), 'pocketbase/pb_hooks');
  const files = fs.readdirSync(hooksDir);

  for (const file of files) {
    if (file === 'main.pb.js' || !file.endsWith('.pb.js')) {
      continue;
    }

    const content = fs.readFileSync(path.join(hooksDir, file), 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('function ')) {
        assert.fail(
          `File pocketbase/pb_hooks/${file} has top-level function declaration at line ${i + 1}. Registered callbacks must be completely self-contained to prevent PocketHost ReferenceErrors.`
        );
      }
    }
  }
});

test('Raw SQL queries in main.pb.js do not use raw colon parameter syntax', () => {
  const content = readGeneratedMain();
  const queryBlocks: string[] = [];
  let startIdx = 0;
  while (true) {
    const newQueryIdx = content.indexOf('.newQuery(`', startIdx);
    if (newQueryIdx === -1) break;
    const endIdx = content.indexOf('`)', newQueryIdx);
    if (endIdx !== -1) {
      queryBlocks.push(content.slice(newQueryIdx, endIdx));
    }
    startIdx = newQueryIdx + 11;
  }

  for (const query of queryBlocks) {
    const paramRegex = /(?<!:|{|[a-zA-Z]|\d):\b[a-zA-Z_]\w*\b/g;
    const matches = query.match(paramRegex) || [];
    if (matches.length > 0) {
      assert.fail(
        `Found invalid raw SQL query parameter syntax: ${matches.join(', ')} in query: ${query}. Named query parameters in PocketBase db().newQuery must always be formatted as {:paramName} to parse correctly.`
      );
    }
  }
});

test('Generated main.pb.js contains no top-level function helper definitions outside callbacks', () => {
  const content = readGeneratedMain();

  // Track whether we're inside a callback-local utility block.
  // Functions declared inside these blocks are explicitly intended as
  // callback-local inlines. Only flag function declarations at the
  // true top level (braceDepth === 0, outside utility blocks).
  let insideCallbackLocalBlock = false;
  let braceDepth = 0;
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Track callback-local utility block boundaries
    if (trimmed.includes('// --- CALLBACK-LOCAL UTILITIES')) {
      insideCallbackLocalBlock = true;
    }
    if (trimmed.includes('// --- END CALLBACK-LOCAL UTILITIES')) {
      insideCallbackLocalBlock = false;
    }

    // Simple brace counting
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '{') braceDepth++;
      if (line[i] === '}') braceDepth--;
    }

    // Only flag function declarations at braceDepth === 0 outside
    // callback-local utility blocks. Functions inside utility blocks
    // are always inside a callback wrapper by construction.
    if (trimmed.startsWith('function ') && !insideCallbackLocalBlock && braceDepth === 0) {
      assert.fail(
        `CRITICAL: Found top-level function declaration at line ${idx + 1} of main.pb.js: "${trimmed}". Registered callbacks must contain all their helper utilities locally inside the callback wrapper to prevent ReferenceError issues on PocketHost.`
      );
    }
  });
});

test('Static dependency declaration check - all relative imports must be declared in dependsOn', () => {
  const srcDir = path.join(process.cwd(), 'pocketbase/pb_hooks_src');

  // Helper to resolve an import path to its normalized relative path inside pb_hooks_src
  function resolveImportPath(importingFile: string, relativeImport: string): string {
    const dir = path.dirname(importingFile);
    let resolved = path.join(dir, relativeImport);
    // Normalize slashes
    resolved = resolved.replace(/\\/g, '/');
    if (!resolved.endsWith('.ts') && !resolved.endsWith('.js')) {
      resolved += '.ts';
    }
    return resolved;
  }

  // Find which bundle (if any) contains the given file
  function findBundleNameForFile(filePath: string): UtilityBundleName | null {
    for (const [name, bundle] of Object.entries(UTILITY_BUNDLES)) {
      if (bundle.files.includes(filePath)) {
        return name as UtilityBundleName;
      }
    }
    return null;
  }

  for (const [bundleName, bundle] of Object.entries(UTILITY_BUNDLES)) {
    for (const file of bundle.files) {
      const absolutePath = path.join(srcDir, file);
      if (!fs.existsSync(absolutePath)) {
        continue; // skip if file doesn't exist (e.g. types/declaration mock files)
      }

      const content = fs.readFileSync(absolutePath, 'utf8');

      // Regex to find relative imports like './foo' or '../bar/baz'
      const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const relativeImport = match[1];
        const resolvedFile = resolveImportPath(file, relativeImport);
        const targetBundle = findBundleNameForFile(resolvedFile);

        if (targetBundle && targetBundle !== bundleName) {
          // This import references a file owned by a different bundle.
          // Verify that the target bundle is declared in the importing bundle's dependsOn list.
          const dependsOnList = bundle.dependsOn || [];
          assert.ok(
            dependsOnList.includes(targetBundle),
            `CRITICAL: File "${file}" in bundle "${bundleName}" imports "${resolvedFile}" (owned by bundle "${targetBundle}"), but "${targetBundle}" is not declared in the dependsOn list of "${bundleName}" inside UTILITY_BUNDLES. This will cause a ReferenceError at runtime on PocketHost. Please add "${targetBundle}" to the dependsOn list for "${bundleName}".`
          );
        }
      }
    }
  }
});

test('Generated main.pb.js does not depend on browser/node QRCode globals', () => {
  const content = readGeneratedMain();

  assert.equal(
    content.includes('QRCode.toString'),
    false,
    'PocketBase hooks must not call QRCode.toString because QRCode is not available in Goja'
  );

  assert.equal(
    /\bQRCode\b/.test(content),
    false,
    'PocketBase hooks must not reference a bare QRCode global'
  );
});
