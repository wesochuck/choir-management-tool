/**
 * ESLint rule: no-hardcoded-inline-styles
 *
 * Flags hardcoded inline style objects in JSX (style={{ ... }}) that
 * are not annotated with // @allow-inline-style.
 *
 * ✅ Allowed (variable/expression reference):
 *   style={dynamicStyles}
 *   style={condition ? activeStyle : inactiveStyle}
 *
 * ✅ Allowed (with @allow-inline-style annotation):
 *   // @allow-inline-style - dynamic width based on progress
 *   style={{ width: progress + '%' }}
 *   style={{ color: 'red' }} // @allow-inline-style - explanation
 *
 * ❌ Flagged (hardcoded object literal without annotation):
 *   style={{ color: 'red', marginTop: '8px' }}
 */

const legacyWhitelist = new Set([
  'src/App.tsx',
  'src/contexts/DialogContext.tsx',
  'src/components/admin/EventModal.tsx',
  'src/components/admin/MusicImportModal.tsx',
  'src/components/admin/SeatingBottomDock.tsx',
  'src/components/admin/EventRosterTable.tsx',
  'src/components/admin/BulkEventModal.tsx',
  'src/components/admin/SeatingFormationsEditor.tsx',
  'src/components/admin/EventList.tsx',
  'src/components/admin/AuditionModal.tsx',
  'src/components/admin/SortableSetListItem.tsx',
  'src/components/admin/RosterImportModal.tsx',
  'src/components/admin/SetListInlineCreator.tsx',
  'src/components/admin/CheckInList.tsx',
  'src/components/admin/SeatingGrid.tsx',
  'src/components/common/MarkdownEditor.tsx',
  'src/components/singer/EventCard.tsx',
  'src/components/player/Playlist.tsx',
  'src/components/player/Player.tsx',
  'src/views/PublicAuditionView.tsx',
  'src/views/admin/SeatingView.tsx',
  'src/views/admin/EventsView.tsx',
  'src/views/admin/EventRosterView.tsx',
  'src/views/admin/event-roster/useEventRosterExport.tsx',
  'src/views/admin/music-library/FloatingAudioPlayer.tsx',
  'src/views/admin/music-library/MusicLibraryTable.tsx',
  'src/views/admin/music-library/LearningTracksEditor.tsx',
  'src/views/admin/music-library/MultiSelectDropdown.tsx',
  'src/views/admin/events/useEventPlayerLink.tsx',
  'src/views/admin/events/EventsTabs.tsx',
  'src/views/admin/AttendanceView.tsx',
  'src/views/PublicPlayerView.tsx',
  'src/views/singer/SeatingFinderView.tsx',
  'src/views/singer/DashboardView.tsx',
]);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hardcoded inline style objects in JSX without @allow-inline-style annotation',
      recommended: false,
    },
    schema: [],
    messages: {
      noHardcodedInlineStyle:
        "Avoid hardcoded inline styles. Use CSS classes instead. If the style is truly dynamic, add a preceding comment: // @allow-inline-style - explanation",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const relPath = filename.includes('/src/')
      ? 'src/' + filename.split('/src/')[1]
      : '';
    if (legacyWhitelist.has(relPath)) {
      return {};
    }

    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'style') return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;

        const expr = node.value.expression;
        if (!expr || expr.type !== 'ObjectExpression') return;

        const lineIndex = node.loc.start.line - 1;
        const currentLine = sourceCode.lines[lineIndex];
        const prevLine = lineIndex > 0 ? sourceCode.lines[lineIndex - 1] : '';

        if (prevLine.includes('@allow-inline-style') || currentLine.includes('@allow-inline-style')) {
          return;
        }

        const insideComments = sourceCode.getCommentsInside
          ? sourceCode.getCommentsInside(node.value)
          : [];
        if (insideComments.some((c) => c.value.includes('@allow-inline-style'))) {
          return;
        }

        context.report({
          node,
          messageId: 'noHardcodedInlineStyle',
        });
      },
};

  },
};
