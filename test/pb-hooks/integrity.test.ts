import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { execSync } from 'child_process';

test('Generated main.pb.js integrity', () => {
    const mainPath = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');
    const content = fs.readFileSync(mainPath, 'utf8');

    // 1. Functional markers
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

    const requiredRoutes = [
        'routerAdd("POST", "/api/generate-rsvp-tokens"',
        'routerAdd("POST", "/api/rsvp-details"',
        'routerAdd("POST", "/api/quick-rsvp"',
        'routerAdd("POST", "/api/unsubscribe"',
        'routerAdd("POST", "/api/admin/bulk-update-rsvps"',
        'routerAdd("POST", "/api/admin/bulk-upsert-attendance"',
    ];

    for (const route of requiredRoutes) {
        assert.ok(content.includes(route), `Generated main file should contain ${route}`);
    }

    function countOccurrences(str: string, needle: string): number {
        return str.split(needle).length - 1;
    }

    for (const route of requiredRoutes) {
        assert.strictEqual(
            countOccurrences(content, route),
            1,
            `Generated main file should contain exactly one registration for ${route}`,
        );
    }

    // 2. Self-containment markers (shared utils inlined into hooks)
    const hookMatches = content.match(/onRecordAfterCreateSuccess/g) || [];
    assert.ok(hookMatches.length >= 2, 'Should have multiple create hooks (messages + eventRosters)');
    
    const utilsInCreateHook = content.split('onRecordAfterCreateSuccess')[1]?.includes('function decodeGoBytes');
    assert.ok(utilsInCreateHook, 'Create hook should have inlined utilities');
});

test('Generator output matches committed file', () => {
    const mainPath = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');
    const originalContent = fs.readFileSync(mainPath, 'utf8');
    
    // Run generator
    execSync('npm run generate:pb-hooks');
    
    const generatedContent = fs.readFileSync(mainPath, 'utf8');
    
    // We ignore the "Generated on" timestamp line for comparison
    const filterTimestamp = (s: string) => s.split('\n').filter(line => !line.startsWith('// Generated on:')).join('\n');
    
    assert.strictEqual(filterTimestamp(generatedContent), filterTimestamp(originalContent), 'Generated file should match committed source (ignoring timestamp)');
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
            // Catch top-level function declarations at column 0
            if (line.startsWith('function ')) {
                assert.fail(`File pocketbase/pb_hooks/${file} has top-level function declaration at line ${i + 1}. Registered callbacks must be completely self-contained to prevent PocketHost ReferenceErrors.`);
            }
        }
    }
});

