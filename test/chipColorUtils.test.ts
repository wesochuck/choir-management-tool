import test from 'node:test';
import assert from 'node:assert/strict';
import { getChipColor, CHIP_COLORS } from '../src/lib/chipColorUtils.ts';

test('getChipColor returns first color for index 0', () => {
    assert.deepEqual(getChipColor(0), CHIP_COLORS[0]);
});

test('getChipColor returns correct color for positive indices within bounds', () => {
    assert.deepEqual(getChipColor(3), CHIP_COLORS[3]);
    assert.deepEqual(getChipColor(7), CHIP_COLORS[7]);
});

test('getChipColor wraps around for indices equal to or greater than array length', () => {
    assert.deepEqual(getChipColor(CHIP_COLORS.length), CHIP_COLORS[0]);
    assert.deepEqual(getChipColor(CHIP_COLORS.length + 1), CHIP_COLORS[1]);
    assert.deepEqual(getChipColor((CHIP_COLORS.length * 2) - 1), CHIP_COLORS[CHIP_COLORS.length - 1]);
});

test('getChipColor handles very large indices', () => {
    assert.deepEqual(getChipColor(CHIP_COLORS.length * 100), CHIP_COLORS[0]);
    assert.deepEqual(getChipColor((CHIP_COLORS.length * 100) + 5), CHIP_COLORS[5]);
});

test('getChipColor returns undefined for negative indices under current implementation', () => {
    assert.equal(getChipColor(-1), undefined);
});
