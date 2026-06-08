import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isColorTooClose, getContrastColor } from '../src/lib/colorUtils';

describe('colorUtils', () => {
  describe('isColorTooClose', () => {
    test('should return true for the exact same color', () => {
      assert.equal(isColorTooClose('#ffffff', '#ffffff'), true);
      assert.equal(isColorTooClose('#000000', '#000000'), true);
      assert.equal(isColorTooClose('#ff0000', '#ff0000'), true);
    });

    test('should return true for very close colors', () => {
      // Distance is sqrt((255-250)^2 + (0-0)^2 + (0-0)^2) = 5
      assert.equal(isColorTooClose('#ff0000', '#fa0000'), true);

      // Distance is sqrt((0-10)^2 + (0-10)^2 + (0-10)^2) = sqrt(300) = ~17.3
      assert.equal(isColorTooClose('#000000', '#0a0a0a'), true);
    });

    test('should return false for distinct colors', () => {
      // Black and white: distance = sqrt(255^2 * 3) = ~441
      assert.equal(isColorTooClose('#ffffff', '#000000'), false);

      // Red and blue: distance = sqrt(255^2 + 0 + 255^2) = ~360
      assert.equal(isColorTooClose('#ff0000', '#0000ff'), false);

      // R diff = 60, distance = 60, 60 is not < 60
      assert.equal(isColorTooClose('#ff0000', '#c30000'), false);
    });

    test('should return false for invalid or missing inputs', () => {
      assert.equal(isColorTooClose('', '#ffffff'), false);
      assert.equal(isColorTooClose('#ffffff', ''), false);
      assert.equal(isColorTooClose('ffffff', '#ffffff'), false);
      assert.equal(isColorTooClose('#ffffff', 'ffffff'), false);
      assert.equal(isColorTooClose('', ''), false);
    });
  });

  describe('getContrastColor', () => {
    test('should return #000000 for light colors', () => {
      assert.equal(getContrastColor('#ffffff'), '#000000');
      assert.equal(getContrastColor('#ffff00'), '#000000'); // Yellow
      assert.equal(getContrastColor('#00ff00'), '#000000'); // Green
      assert.equal(getContrastColor('#cccccc'), '#000000'); // Light gray
    });

    test('should return #ffffff for dark colors', () => {
      assert.equal(getContrastColor('#000000'), '#ffffff');
      assert.equal(getContrastColor('#0000ff'), '#ffffff'); // Blue
      assert.equal(getContrastColor('#ff0000'), '#ffffff'); // Red
      assert.equal(getContrastColor('#333333'), '#ffffff'); // Dark gray
    });

    test('should return var(--text) for invalid inputs', () => {
      assert.equal(getContrastColor(''), 'var(--text)');
      assert.equal(getContrastColor('ffffff'), 'var(--text)'); // Missing #
      assert.equal(getContrastColor('#fff'), 'var(--text)'); // Length < 7
    });
  });
});
