import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seatingView = readFileSync(new URL('../src/views/admin/SeatingView.tsx', import.meta.url), 'utf8');
const seatingGrid = readFileSync(new URL('../src/components/admin/SeatingGrid.tsx', import.meta.url), 'utf8');
const seatingCss = readFileSync(new URL('../src/views/admin/SeatingView.css', import.meta.url), 'utf8');

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
    seatingCss,
    /\.seating-main-layout\s*\{[\s\S]*min-width:\s*0;/,
    'main seating layout must allow flex children to shrink instead of forcing page overflow',
  );

  assert.match(
    seatingCss,
    /\.seating-card-editor\s*\{[\s\S]*min-width:\s*0;/,
    'editor card must allow its grid child to fit the available browser width',
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
