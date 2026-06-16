import test from 'node:test';
import assert from 'node:assert/strict';
import { getChipClass, CHIP_CLASSES } from '../src/lib/chipColorUtils.ts';

test('getChipClass returns first color for index 0', () => {
    assert.deepEqual(getChipClass(0), CHIP_CLASSES[0]);
});

test('getChipClass returns correct color for positive indices within bounds', () => {
    assert.deepEqual(getChipClass(3), CHIP_CLASSES[3]);
    assert.deepEqual(getChipClass(7), CHIP_CLASSES[7]);
});

test('getChipClass wraps around for indices equal to or greater than array length', () => {
    assert.deepEqual(getChipClass(CHIP_CLASSES.length), CHIP_CLASSES[0]);
    assert.deepEqual(getChipClass(CHIP_CLASSES.length + 1), CHIP_CLASSES[1]);
    assert.deepEqual(getChipClass((CHIP_CLASSES.length * 2) - 1), CHIP_CLASSES[CHIP_CLASSES.length - 1]);
});

test('getChipClass handles very large indices', () => {
    assert.deepEqual(getChipClass(CHIP_CLASSES.length * 100), CHIP_CLASSES[0]);
    assert.deepEqual(getChipClass((CHIP_CLASSES.length * 100) + 5), CHIP_CLASSES[5]);
});

test('getChipClass returns undefined for negative indices under current implementation', () => {
    assert.equal(getChipClass(-1), undefined);
});
