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
    assert.ok(content.includes('onRecordAfterCreateSuccess'), 'Should contain create hook');
    assert.ok(content.includes('onRecordAfterUpdateSuccess'), 'Should contain update hook');
    assert.ok(content.includes('routerAdd("POST", "/api/test-smtp"'), 'Should contain test-smtp route');
    assert.ok(content.includes('encodeURIComponent(token)'), 'Should use encodeURIComponent for tokens');
    assert.ok(content.includes('filters.alreadySent === true'), 'Should check alreadySent filter');
    assert.ok(content.includes('oldStatus === "Draft"'), 'Should check oldStatus transition');
    assert.ok(content.includes('role") !== "admin"'), 'Should preserve admin-only route protection');

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
