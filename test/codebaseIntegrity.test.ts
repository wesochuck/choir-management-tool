import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getSrcFiles, resolveProjectPath } from './helpers.ts';
import { decodeGoBytes, parseJsonField } from '../src/lib/pocketbaseJson.ts';

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
  assert.ok(content.includes('showToast'), 'DialogContext must declare and export showToast method');
});

test('codebase integrity: MusicLibraryView must listen to Enter onNewMovement inputs', () => {
  const file = resolveProjectPath('src/views/admin/MusicLibraryView.tsx');
  const content = fs.readFileSync(file, 'utf8');

  // Verify handleAddMovement is updated to accept an event argument or parameter
  assert.ok(
    content.includes('const handleAddMovement = async (e?:') ||
    content.includes('const handleAddMovement = async (e: React.FormEvent') ||
    /const\s+handleAddMovement\s*=\s*async\s*\(\s*e\??\s*:\s*/.test(content),
    'handleAddMovement must accept an optional event argument'
  );

  // Verify the movement title input checks for Enter key
  assert.ok(
    content.includes('newMovementTitle') && content.includes('onKeyDown') && content.includes('handleAddMovement('),
    'MusicLibraryView must define onKeyDown handler on newMovementTitle input to trigger handleAddMovement'
  );
});

test('codebase integrity: parentTitle and headphone indicators integration', () => {
  const serviceFile = resolveProjectPath('src/services/playerService.ts');
  const playlistFile = resolveProjectPath('src/components/player/Playlist.tsx');
  const playerFile = resolveProjectPath('src/components/player/Player.tsx');
  const libraryViewFile = resolveProjectPath('src/views/admin/MusicLibraryView.tsx');

  // Verify PlayerMediaFile interface has parentTitle
  const serviceContent = fs.readFileSync(serviceFile, 'utf8');
  assert.ok(serviceContent.includes('parentTitle?: string;'), 'PlayerMediaFile must declare parentTitle?: string');

  // Verify Playlist renders parentTitle
  const playlistContent = fs.readFileSync(playlistFile, 'utf8');
  assert.ok(playlistContent.includes('parentTitle') && playlistContent.includes('track-parent-title'), 'Playlist must render parentTitle utilizing track-parent-title');

  // Verify Player renders parentTitle and uses track-parent-label
  const playerContent = fs.readFileSync(playerFile, 'utf8');
  assert.ok(playerContent.includes('parentTitle') && playerContent.includes('track-parent-label'), 'Player must render parentTitle utilizing track-parent-label');

  // Verify MusicLibraryView renders totalMovementTracksCount and hasTracks headphone emoji
  const libraryContent = fs.readFileSync(libraryViewFile, 'utf8');
  assert.ok(libraryContent.includes('totalMovementTracksCount') && libraryContent.includes('hasTracks'), 'MusicLibraryView must compute totalMovementTracksCount and hasTracks to render headphone indicators');
});


