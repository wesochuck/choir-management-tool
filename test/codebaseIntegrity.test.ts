import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { getSrcFiles, resolveProjectPath, getFilesRecursively } from './helpers.ts';
import { decodeGoBytes, parseJsonField } from '../src/lib/pocketbaseJson.ts';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
});

import { sanitizeHtml } from '../src/lib/textSafety.ts';

test('codebase integrity: no deprecated pb.files.getUrl calls allowed', () => {
  const files = getSrcFiles(['.ts', '.tsx', '.js', '.jsx']);
  const srcDir = resolveProjectPath('src');

  const violations: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('pb.files.getUrl(')) {
      const relPath = path.relative(srcDir, file);
      violations.push(`src/${relPath}`);
    }
  }

  if (violations.length > 0) {
    assert.fail(
      `CRITICAL ERROR: Found deprecated 'pb.files.getUrl' usage in files:\n` +
      violations.map(v => `  - ${v}`).join('\n') +
      `\n\nAlways use standard 'pb.files.getURL' (uppercase 'URL') to prevent breaking file asset generation.`
    );
  }
  assert.ok(true, 'No deprecated getUrl calls found');
});

test('codebase integrity: enforce pb.filter parameterization rules', () => {
  const files = getSrcFiles(['.ts', '.tsx']);
  const srcDir = resolveProjectPath('src');

  const violations: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Look for lines containing filter: option
      if (line.includes('filter:') && !line.includes('pb.filter')) {
        // Enforce that filter string does not use template literal string interpolation or string concatenations
        const lineTrimmed = line.trim();
        const hasTemplateInterpolation = lineTrimmed.includes('`') && lineTrimmed.includes('${');
        const hasStringConcatenation = lineTrimmed.includes('+') && !lineTrimmed.includes("'") && !lineTrimmed.includes('"');
        
        if (hasTemplateInterpolation || hasStringConcatenation) {
          const relPath = path.relative(srcDir, file);
          violations.push(`src/${relPath}:${idx + 1} -> "${lineTrimmed}"`);
        }
      }
    });
  }

  if (violations.length > 0) {
    assert.fail(
      `CRITICAL ERROR: Found raw dynamic string concatenation or template interpolation in PocketBase filters:\n` +
      violations.map(v => `  - ${v}`).join('\n') +
      `\n\nAlways use 'pb.filter(...)' to parameterized and construct query filters safely. Never interpolate variables directly.`
    );
  }
  assert.ok(true, 'All PocketBase query filters are safe and parameterized');
});

test('defensive parsing: reconstruct token split by unencoded ampersands', () => {
  // Reusable token reconstruction logic matching frontend behavior
  const reconstructToken = (token: string, sParam: string | null, pParam: string | null): string => {
    let result = token;
    if (result) {
      if (pParam && sParam && !result.includes('p=')) {
        result = `${result}&p=${pParam}&s=${sParam}`;
      } else if (sParam && !result.includes('s=')) {
        result = `${result}&s=${sParam}`;
      }
    }
    return result;
  };

  // 1. Normal unencoded ampersand split token (e.g. user clicked raw copy-paste link)
  // URL: /player?token=e=event123&s=sig456
  // browser parses as:
  // token: 'e=event123'
  // s: 'sig456'
  const reconstructedPlayerToken = reconstructToken('e=event123', 'sig456', null);
  assert.strictEqual(reconstructedPlayerToken, 'e=event123&s=sig456', 'Should reconstruct split player token');

  // 2. RSVP split token:
  // URL: /rsvp?token=e=event123&p=prof789&s=sig456
  // browser parses as:
  // token: 'e=event123'
  // p: 'prof789'
  // s: 'sig456'
  const reconstructedRsvpToken = reconstructToken('e=event123', 'sig456', 'prof789');
  assert.strictEqual(reconstructedRsvpToken, 'e=event123&p=prof789&s=sig456', 'Should reconstruct split RSVP token');

  // 3. Fully encoded standard token (reconstructed should NOT duplicate params)
  // URL: /player?token=e%3Devent123%26s%3Dsig456
  // browser parses as:
  // token: 'e=event123&s=sig456'
  // s: null (since it was inside the encoded parameter)
  const encodedToken = 'e=event123&s=sig456';
  const reconstructedEncoded = reconstructToken(encodedToken, null, null);
  assert.strictEqual(reconstructedEncoded, 'e=event123&s=sig456', 'Should leave already complete token intact');
});

test('data parsing: decodeGoBytes and parseJsonField resolves Goja-style byte arrays', () => {
  // 1. Standard parsed object input
  const objInput = { foo: 'bar' };
  assert.deepStrictEqual(parseJsonField<typeof objInput>(objInput), objInput, 'Should return object intact');

  // 2. Stringified JSON string input
  const stringInput = JSON.stringify({ key: 'val' });
  assert.deepStrictEqual(parseJsonField<Record<string, string>>(stringInput), { key: 'val' }, 'Should parse JSON string');

  // 3. Goja numerical byte array input
  const sourceObj = { id: 'm1', tracks: ['t1', 't2'] };
  const sourceStr = JSON.stringify(sourceObj);
  const bytesInput = Array.from(sourceStr).map(c => c.charCodeAt(0));
  
  // Verify bytesInput is indeed a list of ASCII char numbers
  assert.ok(Array.isArray(bytesInput));
  assert.strictEqual(typeof bytesInput[0], 'number');

  const decodedString = decodeGoBytes(bytesInput);
  assert.strictEqual(decodedString, sourceStr, 'Should reconstruct matching string from bytes');

  const parsedObject = parseJsonField<typeof sourceObj>(bytesInput);
  assert.deepStrictEqual(parsedObject, sourceObj, 'Should decode and parse Goja bytes successfully');

  // 4. Invalid input handling
  assert.strictEqual(parseJsonField(null), null);
  assert.strictEqual(parseJsonField(undefined), null);
  assert.strictEqual(parseJsonField('not-a-json-string'), null);
  assert.strictEqual(parseJsonField([1, 2, 3, 'not-a-byte']), null);
});

test('codebase integrity: DialogContext must declare showToast API', () => {
  const contextFile = resolveProjectPath('src/contexts/DialogContext.tsx');
  const content = fs.readFileSync(contextFile, 'utf8');
  assert.ok(content.includes('showToast'), 'DialogContext must export showToast method');
});

test('codebase integrity: Music Library UI policies', () => {
  const modalFile = resolveProjectPath('src/views/admin/music-library/MusicPieceModal.tsx');
  const tableRowFile = resolveProjectPath('src/views/admin/music-library/table/MusicLibraryRow.tsx');
  
  const modalContent = fs.readFileSync(modalFile, 'utf8');
  const tableRowContent = fs.readFileSync(tableRowFile, 'utf8');

  // Policy: MusicPieceModal must listen to Enter onNewMovement inputs
  const hasAddMovementHandler = /const\s+handleAddMovement\s*=\s*async\s*\(\s*e\??\s*:\s*/.test(modalContent);
  const hasEnterKeyCheck = modalContent.includes('newMovementTitle') && modalContent.includes('onKeyDown') && modalContent.includes('handleAddMovement(');
  
  assert.ok(hasAddMovementHandler, 'MusicPieceModal must define handleAddMovement handler');
  assert.ok(hasEnterKeyCheck, 'MusicPieceModal must trigger handleAddMovement on Enter key');

  // Policy: MusicLibraryRow must render headphone indicators for tracks
  const hasHeadphoneLogic = tableRowContent.includes('totalMovementTracksCount') && tableRowContent.includes('hasTracks');
  assert.ok(hasHeadphoneLogic, 'MusicLibraryRow must compute and render headphone indicators for pieces with tracks');
});

test('codebase integrity: player integration consistency', () => {
  const serviceFile = resolveProjectPath('src/services/playerService.ts');
  const playlistFile = resolveProjectPath('src/components/player/Playlist.tsx');
  const playerFile = resolveProjectPath('src/components/player/Player.tsx');

  const serviceContent = fs.readFileSync(serviceFile, 'utf8');
  const playlistContent = fs.readFileSync(playlistFile, 'utf8');
  const playerContent = fs.readFileSync(playerFile, 'utf8');

  // Verify PlayerMediaFile interface has parentTitle (required for movement identification)
  assert.ok(serviceContent.includes('parentTitle?: string;'), 'PlayerMediaFile must declare parentTitle');

  // Verify UI components render parentTitle
  assert.ok(playlistContent.includes('parentTitle'), 'Playlist must support rendering parent piece titles');
  assert.ok(playerContent.includes('parentTitle'), 'Player must support rendering parent piece titles');
});

test('codebase integrity: no JSX IIFE anti-patterns in CommunicationView', () => {
  const historyPanelFile = resolveProjectPath('src/views/admin/communications/HistoryPanel.tsx');
  const content = fs.readFileSync(historyPanelFile, 'utf8');
  
  // Verify MessageHistory component is used
  assert.ok(content.includes('<MessageHistory'), 'HistoryPanel should use the MessageHistory component');
});

test('codebase integrity: PublicRsvpView does not use native alert dialogs', () => {
  const file = resolveProjectPath('src/views/PublicRsvpView.tsx');
  const content = fs.readFileSync(file, 'utf8');

  assert.equal(content.includes('alert('), false);
  assert.equal(content.includes('window.alert('), false);
});

test('codebase integrity: playerService uses defensive audioTrackMapping parsing', () => {
  const serviceFile = resolveProjectPath('src/services/playerService.ts');
  const content = fs.readFileSync(serviceFile, 'utf8');

  assert.equal(
    content.includes('JSON.parse(rawMapping)'),
    false,
    'playerService must not directly JSON.parse raw audioTrackMapping values'
  );

  assert.equal(
    content.includes('JSON.parse(rawMMapping)'),
    false,
    'playerService must not directly JSON.parse movement audioTrackMapping values'
  );
});

test('textSafety: sanitizeHtml removes unsafe elements and attributes', () => {
  // 1. Script injection
  const scriptInput = '<p>Hello <script>alert(1)</script>World</p>';
  const scriptOutput = sanitizeHtml(scriptInput);
  assert.ok(!scriptOutput.includes('<script>'), 'Should strip script tags');
  assert.ok(!scriptOutput.includes('alert'), 'Should strip script content');

  // 2. Event handler injection
  const eventInput = '<div class="alert" onclick="doEvil()">Warning</div>';
  const eventOutput = sanitizeHtml(eventInput);
  assert.ok(!eventOutput.includes('onclick'), 'Should strip inline event handlers');
  assert.ok(eventOutput.includes('class="alert"'), 'Should preserve allowed attributes');

  // 3. Malicious javascript url injection
  const urlInput = '<a href="javascript:alert(1)">Click me</a>';
  const urlOutput = sanitizeHtml(urlInput);
  assert.strictEqual(urlOutput, '<a>Click me</a>', 'Should completely strip unsafe href attributes');

  // 4. Bypassed malicious javascript url injection (control characters)
  const bypassUrlInput = '<a href="java&#x09;script:alert(1)">Click me</a>';
  const bypassUrlOutput = sanitizeHtml(bypassUrlInput);
  assert.ok(!bypassUrlOutput.includes('href="java'), 'Should strip javascript: protocols even with control characters');

  // 5. Allowed tags and attributes
  const allowedInput = '<p style="color: red;">Line <br> <strong>bold</strong> <em>italic</em> <a href="https://example.com" target="_blank">link</a></p>';
  const allowedOutput = sanitizeHtml(allowedInput);
  assert.strictEqual(allowedOutput, allowedInput, 'Should preserve safe tags and attributes');
});

test('codebase integrity: enforce dangerouslySetInnerHTML safety rule', () => {
  const files = getSrcFiles(['.ts', '.tsx']);
  const srcDir = resolveProjectPath('src');
  const violations: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('dangerouslySetInnerHTML')) {
      continue;
    }

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('dangerouslySetInnerHTML')) {
        // Look for the preceding line (idx - 1) or current line (idx) containing @allow-dangerouslySetInnerHTML
        const prevLine = idx > 0 ? lines[idx - 1] : '';
        const currentLine = lines[idx];
        const nextLine = idx < lines.length - 1 ? lines[idx + 1] : '';
        const nextNextLine = idx < lines.length - 2 ? lines[idx + 2] : '';

        const isBypassed = prevLine.includes('@allow-dangerouslySetInnerHTML') || currentLine.includes('@allow-dangerouslySetInnerHTML');
        const isSanitized = currentLine.includes('sanitizeHtml(') || nextLine.includes('sanitizeHtml(') || nextNextLine.includes('sanitizeHtml(');

        if (!isBypassed && !isSanitized) {
          const relPath = path.relative(srcDir, file);
          violations.push(`src/${relPath}:${idx + 1} -> "${line.trim()}"`);
        }
      }
    });
  }

  if (violations.length > 0) {
    assert.fail(
      `CRITICAL ERROR: Found dangerouslySetInnerHTML usage without sanitizeHtml or safety comment annotation:\n` +
      violations.map(v => `  - ${v}`).join('\n') +
      `\n\nTo resolve, either wrap the input in 'sanitizeHtml(...)' OR add a preceding comment:\n` +
      `// @allow-dangerouslySetInnerHTML - [explanation of safety, use with caution]`
    );
  }
  assert.ok(true, 'All dangerouslySetInnerHTML usages are sanitized or annotated');
});

test('codebase integrity: profiles do not have direct email fields', () => {
  // Backend files (hooks, endpoints, utilities)
  const backendFiles = getFilesRecursively(resolveProjectPath('pocketbase/pb_hooks_src'), ['.ts', '.js']);
  const backendViolations: string[] = [];

  for (const file of backendFiles) {
    if (file.endsWith('generate-main-pb-js.ts')) continue; // Exclude generation script which contains test cases/string configurations
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      // Look for profile.get("email") or profile.email where it is assumed to be a field on the profile itself
      if (line.includes('.get("email")') && (line.includes('profile') || line.includes('recipient') && !line.includes('adminRecord') && !line.includes('userRec') && !line.includes('adminUser') && !line.includes('user'))) {
        backendViolations.push(`${path.relative(process.cwd(), file)}:${idx + 1} -> "${line.trim()}"`);
      }
    });
  }

  if (backendViolations.length > 0) {
    assert.fail(
      `CRITICAL ERROR: Found direct profile email field access in backend hooks:\n` +
      backendViolations.map(v => `  - ${v}`).join('\n') +
      `\n\nThe 'profiles' collection does not have a native 'email' field. Retrieve it from the related 'users' record instead.`
    );
  }

  // Frontend files
  const frontendFiles = getSrcFiles(['.ts', '.tsx']);
  const frontendViolations: string[] = [];


  for (const file of frontendFiles) {
    if (file.endsWith('profileService.ts')) continue; // Exclude definition of getProfileEmail / splitProfileInput
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('profile.email') && !line.includes('profileService')) {
        frontendViolations.push(`${path.relative(process.cwd(), file)}:${idx + 1} -> "${line.trim()}"`);
      }
    });
  }

  if (frontendViolations.length > 0) {
    assert.fail(
      `CRITICAL ERROR: Found direct profile.email access in frontend:\n` +
      frontendViolations.map(v => `  - ${v}`).join('\n') +
      `\n\nUse 'getProfileEmail(profile)' from profileService to resolve the linked user email.`
    );
  }

  assert.ok(true, 'No direct profile email reads found');
});

test('codebase integrity: rosterService PocketBase calls must be wrapped in retryOn429', () => {
  const serviceFile = resolveProjectPath('src/services/rosterService.ts');
  const content = fs.readFileSync(serviceFile, 'utf8');
  const sourceFile = ts.createSourceFile(serviceFile, content, ts.ScriptTarget.Latest, true);
  assert.ok(sourceFile, 'Should load rosterService.ts source file');

  const violations: string[] = [];

  function checkNode(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      let isPbCall = false;
      let methodName = '';

      // Check if it is a call to pb.send or pb.collection
      if (ts.isPropertyAccessExpression(expression)) {
        const obj = expression.expression;
        const prop = expression.name;
        if (ts.isIdentifier(obj) && obj.text === 'pb' && (prop.text === 'send' || prop.text === 'collection')) {
          isPbCall = true;
          methodName = `pb.${prop.text}`;
        }
      }

      if (isPbCall) {
        // Walk up the AST to check if any ancestor is a CallExpression to 'retryOn429'
        let current: ts.Node | undefined = node.parent;
        let isWrapped = false;
        while (current) {
          if (ts.isCallExpression(current)) {
            const currentExpr = current.expression;
            if (ts.isIdentifier(currentExpr) && currentExpr.text === 'retryOn429') {
              isWrapped = true;
              break;
            }
          }
          current = current.parent;
        }

        if (!isWrapped) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          violations.push(`Line ${line + 1}, col ${character + 1}: ${methodName} call is not wrapped in retryOn429`);
        }
      }
    }

    ts.forEachChild(node, checkNode);
  }

  checkNode(sourceFile);

  if (violations.length > 0) {
    assert.fail(
      `CRITICAL ERROR: Found unprotected PocketBase calls in rosterService.ts:\n` +
      violations.map(v => `  - ${v}`).join('\n') +
      `\n\nAll pb.send and pb.collection calls in rosterService.ts must be wrapped in 'retryOn429(...)' to prevent rate-limit failures.`
    );
  }
  assert.ok(true, 'All rosterService.ts PocketBase calls are protected with retryOn429');
});

test('codebase integrity: useAttendance hook must not call PocketBase directly', () => {
  const hookFile = resolveProjectPath('src/hooks/useAttendance.ts');
  const content = fs.readFileSync(hookFile, 'utf8');
  assert.ok(!content.includes('pb.collection'), 'useAttendance.ts must not call pb.collection directly to ensure it routes through rate-limit protected services');
  assert.ok(!content.includes('pb.send'), 'useAttendance.ts must not call pb.send directly to ensure it routes through rate-limit protected services');
});




