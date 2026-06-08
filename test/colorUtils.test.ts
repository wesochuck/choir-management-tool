import test from 'node:test';
import assert from 'node:assert/strict';
import { getContrastColor, isColorTooClose } from '../src/lib/colorUtils.ts';

test('getContrastColor returns fallback for invalid inputs', () => {
  assert.equal(getContrastColor(''), 'var(--text)');
  assert.equal(getContrastColor('000000'), 'var(--text)');
  assert.equal(getContrastColor('ffffff'), 'var(--text)');
  assert.equal(getContrastColor('#000'), 'var(--text)'); // 3-digit hex not supported
  assert.equal(getContrastColor('#ff'), 'var(--text)');
});

test('getContrastColor returns black for light colors', () => {
  assert.equal(getContrastColor('#ffffff'), '#000000'); // White
  assert.equal(getContrastColor('#ffff00'), '#000000'); // Yellow
  assert.equal(getContrastColor('#00ff00'), '#000000'); // Green
  assert.equal(getContrastColor('#cccccc'), '#000000'); // Light Gray
});

test('getContrastColor returns white for dark colors', () => {
  assert.equal(getContrastColor('#000000'), '#ffffff'); // Black
  assert.equal(getContrastColor('#0000ff'), '#ffffff'); // Blue
  assert.equal(getContrastColor('#800000'), '#ffffff'); // Dark Red
  assert.equal(getContrastColor('#333333'), '#ffffff'); // Dark Gray
});

test('isColorTooClose handles invalid inputs gracefully', () => {
  assert.equal(isColorTooClose('', '#ffffff'), false);
  assert.equal(isColorTooClose('#000000', ''), false);
  assert.equal(isColorTooClose('000000', 'ffffff'), false);
  assert.equal(isColorTooClose('#000000', 'ffffff'), false);
  assert.equal(isColorTooClose('000000', '#ffffff'), false);
  assert.equal(isColorTooClose('', ''), false);
  // Optional chaining / any cast if testing non-string, but types restrict us.
});

test('isColorTooClose returns true for similar colors', () => {
  assert.equal(isColorTooClose('#000000', '#000000'), true); // Identical
  assert.equal(isColorTooClose('#000000', '#010101'), true); // Very close
  assert.equal(isColorTooClose('#ffffff', '#fefefe'), true); // Very close light
  assert.equal(isColorTooClose('#102030', '#122232'), true); // Close mixed

  // Difference of 34 in all components: sqrt(34^2 * 3) ~ 58.88 < 60
  // 34 is 0x22 in hex
  assert.equal(isColorTooClose('#000000', '#222222'), true);
});

test('isColorTooClose returns false for distinctly different colors', () => {
  assert.equal(isColorTooClose('#000000', '#ffffff'), false); // Black vs White
  assert.equal(isColorTooClose('#ff0000', '#00ff00'), false); // Red vs Green

  // Difference of 35 in all components: sqrt(35^2 * 3) ~ 60.62 > 60
  // 35 is 0x23 in hex
  assert.equal(isColorTooClose('#000000', '#232323'), false);

  // Difference of 60 in one component: sqrt(60^2) = 60 (is not < 60)
  // 60 is 0x3c in hex
  assert.equal(isColorTooClose('#000000', '#3c0000'), false);
});
