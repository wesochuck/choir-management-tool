import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_FONT_OPTIONS, getPublicFontStack } from '../../src/lib/publicFonts';

test('PUBLIC_FONT_OPTIONS contains standard elements', () => {
  assert.ok(Array.isArray(PUBLIC_FONT_OPTIONS));
  assert.ok(PUBLIC_FONT_OPTIONS.length > 0);

  for (const option of PUBLIC_FONT_OPTIONS) {
    assert.ok('id' in option);
    assert.ok('label' in option);
    assert.ok('cssStack' in option);
    assert.strictEqual(typeof option.id, 'string');
    assert.strictEqual(typeof option.label, 'string');
    assert.strictEqual(typeof option.cssStack, 'string');
  }
});

test('getPublicFontStack returns correct cssStack for valid fontId', () => {
  assert.strictEqual(
    getPublicFontStack('system'),
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  );
  assert.strictEqual(
    getPublicFontStack('serif'),
    'Georgia, "Times New Roman", serif'
  );
  assert.strictEqual(
    getPublicFontStack('casual-handwritten'),
    '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", casual, cursive'
  );
});

test('getPublicFontStack returns default cssStack when fontId is undefined', () => {
  assert.strictEqual(
    getPublicFontStack(undefined),
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  );
});

test('getPublicFontStack returns default cssStack when fontId is invalid/unknown', () => {
  // @ts-expect-error Testing invalid runtime input
  assert.strictEqual(
    getPublicFontStack('invalid-font-id'),
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  );
});
