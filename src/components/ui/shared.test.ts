import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutOnly } from './shared';

test('layoutOnly returns undefined for undefined input', () => {
  assert.equal(layoutOnly(), undefined);
});

test('layoutOnly returns undefined for empty string', () => {
  assert.equal(layoutOnly(''), undefined);
});

test('layoutOnly returns undefined for whitespace-only input', () => {
  assert.equal(layoutOnly('   '), undefined);
});

test('layoutOnly returns undefined when every class is a visual class', () => {
  assert.equal(layoutOnly('bg-red-500 text-white border rounded'), undefined);
});

test('layoutOnly strips visual classes and keeps layout classes', () => {
  assert.equal(
    layoutOnly('w-full flex bg-red-500 p-2'),
    'w-full flex',
  );
});

test('layoutOnly preserves margin classes (m-, mx-, my-, mt-, mb-, ml-, mr-)', () => {
  // Margins are layout, not visual. The prefix list intentionally omits them
  // so they pass through unchanged.
  assert.equal(
    layoutOnly('m-2 mx-auto mt-4 bg-red-500'),
    'm-2 mx-auto mt-4',
  );
});

test('layoutOnly strips a mix of visual and pseudo-class classes', () => {
  assert.equal(
    layoutOnly('w-full placeholder:text-slate-400 focus:ring-primary transition-colors'),
    'w-full',
  );
});

test('layoutOnly handles multi-class strings with arbitrary whitespace', () => {
  assert.equal(
    layoutOnly('  w-full   flex   bg-red-500  '),
    'w-full flex',
  );
});

test('layoutOnly preserves size classes (size-N) since they are not in the strip list', () => {
  // `size-4` does not start with any of the visual-class prefixes, so it is
  // treated as a layout class and passes through.
  assert.equal(layoutOnly('size-4 w-full'), 'size-4 w-full');
});
