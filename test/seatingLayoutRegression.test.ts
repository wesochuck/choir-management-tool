import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const seatingView = readFileSync(resolve(process.cwd(), 'src/views/admin/SeatingView.tsx'), 'utf8');
const seatingGrid = readFileSync(resolve(process.cwd(), 'src/components/admin/SeatingGrid.tsx'), 'utf8');
const seatingBottomDock = readFileSync(resolve(process.cwd(), 'src/components/admin/SeatingBottomDock.tsx'), 'utf8');
const singerLookupModal = readFileSync(resolve(process.cwd(), 'src/components/admin/SingerLookupModal.tsx'), 'utf8');
const indexCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

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

test('seating grid fit math uses the rendered row label width and avoids nested scrollbars', () => {
  assert.match(
    seatingGrid,
    /const\s+rowLabelWidth\s*=\s*isCompact\s*\?\s*110\s*:\s*130\s*;/,
    'fit calculation should reserve the same row label width that is rendered in the row',
  );

  assert.match(
    seatingGrid,
    /style=\{\{\s*width:\s*`\$\{rowLabelWidth\}px`\s*\}\}/,
    'rendered row label width should be driven by the shared rowLabelWidth constant',
  );

  assert.ok(
    !/overflow-x-auto/.test(seatingGrid),
    'seating grid should not create a nested horizontal scroll container when seats are fitted to the available width',
  );
});

test('seating grid preserves vertical spacing between rendered seat rows', () => {
  assert.match(
    seatingGrid,
    /className="w-full overflow-x-clip overflow-y-visible flex flex-col"/,
    'the inner seating-row wrapper should stack row-print rows vertically',
  );

  assert.match(
    seatingGrid,
    /style=\{\{\s*gap:\s*rowGap\s*\}\}/,
    'the inner seating-row wrapper should apply the computed rowGap between rows',
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

test('legacy flex helpers have been removed in favor of Tailwind native classes', () => {
  assert.ok(
    !/:where\(\.flex-row\)/.test(indexCss),
    'legacy :where(.flex-row) helper should be removed — Tailwind flex flex-row classes are the replacement',
  );

  assert.ok(
    !/:where\(\.flex-col\)/.test(indexCss),
    'legacy :where(.flex-col) helper should be removed — Tailwind flex flex-col classes are the replacement',
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

test('seating chart selection uses a compact ordered dropdown instead of a wrapping tab row', () => {
  assert.match(
    seatingView,
    /xl:grid-cols-\[0\.8fr_1fr_1fr_1\.6fr\]/,
    'the top seating controls should reserve less width for Performance and more width for Chart',
  );

  assert.match(
    seatingView,
    /aria-label="Select seating chart"/,
    'chart selection should use a compact dropdown control',
  );

  assert.match(
    seatingView,
    /\$\{index \+ 1\}\.\s*\$\{c\.name\}/,
    'chart dropdown options should show concert order numbers',
  );

  assert.match(
    seatingView,
    /title="Move chart earlier in concert order"/,
    'active chart should have a compact move-earlier order control',
  );

  assert.match(
    seatingView,
    /title="Move chart later in concert order"/,
    'active chart should have a compact move-later order control',
  );

  assert.ok(
    !/visibleTabCount|tabsContainerRef|CHART_DRAG_MIME/.test(seatingView),
    'old tab-row measurement and drag-only chart ordering state should be removed',
  );
});

test('unassigned singer shelf uses grouped chips with one shared scroll area', () => {
  assert.ok(
    !/grid h-\[220px\]/.test(seatingBottomDock),
    'unassigned shelf should not use a fixed-height multi-column lane grid',
  );

  assert.match(
    seatingBottomDock,
    /className="flex max-h-\[190px\] flex-col gap-3 overflow-y-auto/,
    'unassigned shelf should use one shared vertical scroll area for all groups',
  );

  assert.match(
    seatingBottomDock,
    /grid-cols-\[repeat\(auto-fill,minmax\(120px,1fr\)\)\]/,
    'each voice group should wrap singer chips with auto-fill columns',
  );

  assert.match(
    seatingBottomDock,
    /data-unassigned-singer-chip/,
    'singers should render as compact draggable chips',
  );

  assert.match(
    seatingBottomDock,
    /!\s*isVoicePartLayout\s*&&\s*\(\s*<span className="inline-flex items-center rounded bg-primary-light/,
    'section-based chart shelves should show voice-part badges on singer chips',
  );
});

test('singer lookup modal uses compact picker rows instead of large cards', () => {
  assert.match(
    singerLookupModal,
    /maxWidth="560px"/,
    'lookup modal should have room for a compact name/voice/status picker row',
  );

  assert.match(
    singerLookupModal,
    /\{filtered\.length\}\s+available singer/,
    'lookup modal should show a concise result count',
  );

  assert.match(
    singerLookupModal,
    /grid-cols-\[minmax\(0,1fr\)_auto_auto\]/,
    'singer result rows should use explicit columns for name, voice, and status',
  );

  assert.ok(
    !/rounded-xl shadow-sm/.test(singerLookupModal),
    'lookup results should not render as tall card buttons',
  );
});
