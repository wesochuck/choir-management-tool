import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { transpileHookSource } from '../../pocketbase/pb_hooks_src/generate-main-pb-js.ts';

function countOccurrences(str: string, needle: string): number {
    return str.split(needle).length - 1;
}

function readGeneratedMain(): string {
    const mainPath = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');
    return fs.readFileSync(mainPath, 'utf8');
}

function extractCallbackAfterMarker(content: string, markerIndex: number, endMarker: string, label: string): string {
    assert.notStrictEqual(markerIndex, -1, `Expected generated file to contain ${label}`);

    const callbackStart = content.indexOf('=> {', markerIndex);
    assert.notStrictEqual(callbackStart, -1, `Expected ${label} registration to use an arrow callback`);
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

function extractRecordHookCallback(content: string, hookName: string, collectionName: string): string {
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
    
    assert.notStrictEqual(startIdx, -1, `Could not find registration for ${hookName} on ${collectionName}`);
    return extractCallbackAfterMarker(content, startIdx, endMarker, `${hookName} for ${collectionName}`);
}


test('Generated main.pb.js integrity', () => {
    const content = readGeneratedMain();

    assert.ok(content.startsWith('// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)'), 'Should contain generated output marker');
    assert.ok(content.includes('cronAdd("post_event_report"'), 'Should contain post_event_report cron');
    assert.ok(content.includes('cronAdd("process_email_queue_job"'), 'Should contain process_email_queue_job cron');
    assert.ok(content.includes('onRecordAfterCreateSuccess'), 'Should contain create hook');
    assert.ok(content.includes('onRecordAfterUpdateSuccess'), 'Should contain update hook');
    assert.ok(content.includes('routerAdd("POST", "/api/queue/process"'), 'Should contain queue process route');
    assert.ok(content.includes('routerAdd("POST", "/api/test-smtp"'), 'Should contain test-smtp route');
    assert.ok(content.includes('shouldQueueMessage'), 'Should utilize shouldQueueMessage check');
    assert.ok(content.includes('enqueueBulkMessage'), 'Should utilize enqueueBulkMessage explosion');
    assert.ok(content.includes('role") !== "admin"'), 'Should preserve admin-only route protection');
    assert.ok(!content.includes('"/api/generate-player-token"'), 'Should not duplicate player endpoint route');
    assert.ok(!content.includes('"/api/player-playlist"'), 'Should not duplicate player playlist route');

    assert.strictEqual(countOccurrences(content, 'routerAdd('), 15, 'Generated main file should contain exactly 15 route registrations');
    assert.strictEqual(countOccurrences(content, 'cronAdd('), 2, 'Generated main file should contain exactly 2 cron registrations');
    assert.strictEqual(countOccurrences(content, 'onRecordAfterCreateSuccess(('), 2, 'Generated main file should contain exactly two create hook registrations');
    assert.strictEqual(countOccurrences(content, 'onRecordAfterUpdateSuccess(('), 2, 'Generated main file should contain exactly two update hook registrations');

    const requiredRoutes = [
        'routerAdd("POST", "/api/generate-rsvp-tokens"',
        'routerAdd("POST", "/api/rsvp-details"',
        'routerAdd("POST", "/api/quick-rsvp"',
        'routerAdd("POST", "/api/unsubscribe"',
        'routerAdd("POST", "/api/admin/bulk-update-rsvps"',
        'routerAdd("POST", "/api/admin/bulk-upsert-attendance"',
    ];

    for (const route of requiredRoutes) {
        assert.strictEqual(
            countOccurrences(content, route),
            1,
            `Generated main file should contain exactly one registration for ${route}`,
        );
    }
});

test('Generated main.pb.js uses callback-local bundles without top-level shared utilities', () => {
    const content = readGeneratedMain();

    assert.ok(!content.includes('// --- SHARED UTILITIES ---'), 'Generated file should not emit the old top-level sharedUtils block');
    assert.ok(!content.includes('__SHARED_UTILS__'), 'Generated file should not leak generator utility placeholders');
    assert.strictEqual(countOccurrences(content, 'CALLBACK-LOCAL UTILITIES'), 34, 'Seventeen utility-bearing callbacks should have start/end local utility markers');

    const filePrelude = content.slice(0, content.indexOf('// --- CRON JOBS ---'));
    assert.ok(!filePrelude.includes('function '), 'Generated file prelude should not contain top-level helper functions');

    const queueRoute = extractRouteCallback(content, '/api/queue/process');
    assert.ok(queueRoute.includes('function processEmailQueue'), 'Queue process callback should contain the email queue processor it calls');
    assert.ok(queueRoute.includes('function parseJsonField'), 'Queue process callback should contain JSON parsing utilities it calls');
    assert.ok(!queueRoute.includes('function handleSingerSeatingProfiles'), 'Queue process callback should not contain unrelated seating endpoint utilities');

    const seatingRoute = extractRouteCallback(content, '/api/singer/seating-profiles');
    assert.ok(seatingRoute.includes('function handleSingerSeatingProfiles'), 'Seating route should contain its endpoint implementation');
    assert.ok(seatingRoute.includes('function parseJsonField'), 'Seating route should contain JSON parsing dependency');
    assert.ok(!seatingRoute.includes('function processEmailQueue'), 'Seating route should not contain unrelated queue processor utilities');

    const testSmtpRoute = extractRouteCallback(content, '/api/test-smtp');
    assert.ok(!testSmtpRoute.includes('CALLBACK-LOCAL UTILITIES'), 'SMTP test route should not include any utility bundle because it does not call shared helpers');

    const postEventReportCron = extractCronCallback(content, 'post_event_report');
    assert.ok(postEventReportCron.includes('function parseJsonField'), 'Attendance report cron should contain JSON parsing utilities');
    assert.ok(postEventReportCron.includes('function sanitizeEmailSubject'), 'Attendance report cron should contain email subject sanitization');
    assert.ok(postEventReportCron.includes('function renderAttendanceReportBody'), 'Attendance report cron should contain attendance report renderer');
    assert.ok(!postEventReportCron.includes('function processEmailQueue'), 'Attendance report cron should not contain unrelated queue processor utilities');

    const processEmailQueueCron = extractCronCallback(content, 'process_email_queue_job');
    assert.ok(processEmailQueueCron.includes('function processEmailQueue'), 'Email queue cron should contain queue processor utilities');
    assert.ok(processEmailQueueCron.includes('function parseJsonField'), 'Email queue cron should contain JSON parsing utilities');
    assert.ok(processEmailQueueCron.includes('function renderMarkdown'), 'Email queue cron should contain markdown rendering utilities');
    assert.ok(processEmailQueueCron.includes('function compileMailjetHtml'), 'Email queue cron should contain Mailjet HTML rendering utilities');
    assert.ok(!processEmailQueueCron.includes('function renderAttendanceReportBody'), 'Email queue cron should not contain unrelated attendance report renderer');

    const createMessagesHook = extractRecordHookCallback(content, 'onRecordAfterCreateSuccess', 'messages');
    assert.ok(createMessagesHook.includes('function shouldQueueMessage'), 'Create messages hook should contain queue eligibility utility');
    assert.ok(createMessagesHook.includes('function enqueueBulkMessage'), 'Create messages hook should contain bulk enqueue utility');
    assert.ok(createMessagesHook.includes('function parseJsonField'), 'Create messages hook should contain JSON parsing dependency');
    assert.ok(!createMessagesHook.includes('function handleCalendarDownload'), 'Create messages hook should not contain unrelated calendar endpoint utilities');

    const updateMessagesHook = extractRecordHookCallback(content, 'onRecordAfterUpdateSuccess', 'messages');
    assert.ok(updateMessagesHook.includes('function shouldQueueMessage'), 'Update messages hook should contain queue eligibility utility');
    assert.ok(updateMessagesHook.includes('function enqueueBulkMessage'), 'Update messages hook should contain bulk enqueue utility');
    assert.ok(updateMessagesHook.includes('function parseJsonField'), 'Update messages hook should contain JSON parsing dependency');
    assert.ok(!updateMessagesHook.includes('function handleSingerSeatingProfiles'), 'Update messages hook should not contain unrelated seating endpoint utilities');

    const createAuditionsHook = extractRecordHookCallback(content, 'onRecordAfterCreateSuccess', 'auditions');
    assert.ok(createAuditionsHook.includes('function processEmailQueue'), 'Create auditions hook should contain processEmailQueue');
    assert.ok(createAuditionsHook.includes('function parseJsonField'), 'Create auditions hook should contain parseJsonField');

    const updateAuditionsHook = extractRecordHookCallback(content, 'onRecordAfterUpdateSuccess', 'auditions');
    assert.ok(updateAuditionsHook.includes('function processEmailQueue'), 'Update auditions hook should contain processEmailQueue');
    assert.ok(updateAuditionsHook.includes('function parseJsonField'), 'Update auditions hook should contain parseJsonField');
});

test('post_event_report subject templating inserts dynamic values literally', () => {
    const content = readGeneratedMain();
    const postEventReportCron = extractCronCallback(content, 'post_event_report');

    assert.ok(
        postEventReportCron.includes('const eventTitle = String(event.get("title") || "");'),
        'Attendance report cron should normalize event title before template replacement',
    );
    assert.ok(
        postEventReportCron.includes('.replace(/{eventTitle}/g, () => eventTitle)'),
        'Attendance report cron should use a functional replacer for eventTitle',
    );
    assert.ok(
        postEventReportCron.includes('.replace(/{eventDate}/g, () => eventDateStr)'),
        'Attendance report cron should use a functional replacer for eventDate',
    );
    assert.ok(
        !postEventReportCron.includes('.replace(/{eventTitle}/g, event.get("title"))'),
        'Attendance report cron should not use a dynamic replacement string for eventTitle',
    );
});

test('Generated main.pb.js does not leak module syntax', () => {
    const content = readGeneratedMain();
    const leakedModuleSyntax = content
        .split('\n')
        .filter((line) => /^\s*(import|export)\b|exports\./.test(line));

    assert.deepStrictEqual(leakedModuleSyntax, [], 'Generated file should not contain import/export syntax or CommonJS export assignments');
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

    assert.ok(output.includes('const namedValue'), 'Named value export should become a plain script const');
    assert.ok(output.includes('function helper'), 'Named function export should become a plain script function');
    assert.ok(output.includes('function defaultHelper'), 'Default function export should become a plain script function');
    assert.ok(!/^\s*import\b/m.test(output), 'Single-line and multi-line imports should be removed');
    assert.ok(!/^\s*export\b/m.test(output), 'Named/default/re-export syntax should be removed');
    assert.ok(!/exports\./.test(output), 'CommonJS export assignments should not be emitted');
});

test('Generator output matches committed file', () => {
    const mainPath = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');
    const originalContent = fs.readFileSync(mainPath, 'utf8');

    execSync('npm run generate:pb-hooks');

    const generatedContent = fs.readFileSync(mainPath, 'utf8');
    assert.strictEqual(generatedContent, originalContent, 'Generated file should match committed source');
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
                assert.fail(`File pocketbase/pb_hooks/${file} has top-level function declaration at line ${i + 1}. Registered callbacks must be completely self-contained to prevent PocketHost ReferenceErrors.`);
            }
        }
    }
});
