import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seatingView = readFileSync(new URL('../src/views/admin/SeatingView.tsx', import.meta.url), 'utf8');
const seatingGrid = readFileSync(new URL('../src/components/admin/SeatingGrid.tsx', import.meta.url), 'utf8');
const indexCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('seating wide layout is reserved for actual fullscreen mode', () => {
  assert.match(
    seatingView,
    /const\s+isWideLayout\s*=\s*isFullscreen\s*;/,
    'normal browser view should not always opt into the wide/fullscreen container breakout',
  );

  assert.ok(
    !/const\s+isWideLayout\s*=\s*true\s*;/.test(seatingView),
    'hard-coding wide layout makes normal browser windows behave like fullscreen',
  );
});

test('seating grid container can shrink inside normal browser layouts', () => {
  assert.match(
    seatingView,
    /min-w-0/,
    'main seating layout must allow flex children to shrink instead of forcing page overflow (Tailwind: min-w-0)',
  );

  assert.match(
    seatingGrid,
    /new\s+ResizeObserver\(updateGridWidth\)/,
    'grid should measure available width so compact seats can adapt in normal view',
  );

  assert.match(
    seatingGrid,
    /Math\.max\(minSeatSize,\s*Math\.min\(baseSeatSize,\s*fittedSeatSize\)\)/,
    'seat sizing should fit the container while preserving a readable minimum size',
  );
});

test('seating drag and drop does not rely on visible grab-handle dots', () => {
  assert.ok(
    !/seat-grab-handle/.test(seatingGrid),
    'seat tiles should not render decorative dot handles; the page instructions explain drag and drop',
  );

  assert.match(
    seatingGrid,
    /draggable=\{!isReadOnly\s*&&\s*!!assignedProfile\}/,
    'assigned seats must remain draggable after removing visual grab handles',
  );
});

test('legacy flex helpers keep their direction when Tailwind is enabled', () => {
  assert.match(
    indexCss,
    /:where\(\.flex-row\)\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*row;/s,
    'legacy flex-row helper must continue to provide display:flex for older row-only layout classes',
  );

  assert.match(
    indexCss,
    /:where\(\.flex-col\)\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    'legacy flex-col helper must stay low-specificity so responsive Tailwind classes like sm:flex-row can override direction',
  );
});

test('seating layout does not rely on Tailwind button utilities that are overridden by btn', () => {
  assert.match(
    seatingGrid,
    /className="[^"]*\bseating-row-action-btn\b[^"]*"/,
    'row add/remove controls need a seating-specific class because .btn is defined after Tailwind utilities',
  );

  assert.match(
    seatingView,
    /className="[^"]*\bseating-toolbar\b[^"]*"/,
    'seating toolbar should use its seating-specific CSS hook instead of depending only on Tailwind utilities',
  );
});
