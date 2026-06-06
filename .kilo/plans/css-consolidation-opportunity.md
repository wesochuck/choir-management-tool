# CSS Consolidation Opportunity: Communications Module

## Overview
There is significant duplication and inconsistency in the CSS styles for the communications module, particularly for automated task components. The `AutomatedTasksPanel` component mixes classes from two different CSS files, leading to maintenance challenges and potential styling conflicts.

## Files Involved
1. `/src/views/admin/communications/Communications.css` - Component-specific styles
2. `/src/views/admin/CommunicationView.css` - View/layout styles  
3. `/src/views/admin/communications/AutomatedTasksPanel.tsx` - Component using both stylesheets

## Duplicated Styles Identified

### Automated Task Grid Styles
**Communications.css:**
```css
.comm-automated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
}
```

**CommunicationView.css:**
```css
.automated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-md);
}
```

### Automated Task Card Styles
**Communications.css:**
```css
.comm-automated-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.comm-automated-card-active {
  border-left: 4px solid var(--primary);
  background-color: var(--primary-lightest, #f0f9ff);
}

.comm-automated-card-inactive {
  opacity: 0.8;
}
```

**CommunicationView.css:**
```css
.automated-task-card {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* Note: CommunicationView.css doesn't have active/inactive variants */
```

### Automated Task Header Styles
**Communications.css:**
```css
.comm-automated-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
```

**CommunicationView.css:**
```css
.automated-task-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
```

### Automated Task Footer Styles
**Communications.css:**
```css
.comm-automated-footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: auto;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-light, #f1f5f9);
}
```

**CommunicationView.css:**
```css
.automated-task-footer {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border);
}
```

### Status Badge Styles
**Communications.css:**
```css
.comm-automated-type-badge,
.comm-automated-resolution-badge {
  white-space: nowrap;
  line-height: 1.2;
}

/* Resolution variants would be defined elsewhere */
```

**CommunicationView.css:**
```css
.automated-task-type-badge,
.automated-task-resolution-badge {
  white-space: nowrap;
  line-height: 1.2;
}

.automated-task-resolution-sent {
  color: var(--primary-deep);
  border-color: var(--primary);
}

.automated-task-resolution-archived {
  color: #475569;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.automated-task-resolution-scheduled {
  color: var(--text-muted);
}
```

## Consolidation Recommendation

### Primary Action
Move all automated task-related styles from `CommunicationView.css` to `Communications.css`, using the `comm-` prefix for consistency, then remove the duplicated styles from `CommunicationView.css`.

### Specific Changes
1. **Move to Communications.css:**
   - `.automated-grid` → `.comm-automated-grid` 
   - `.automated-task-card` → `.comm-automated-task-card`
   - `.automated-task-header` → `.comm-automated-task-header`
   - `.automated-task-status-group` → `.comm-automated-task-status-group`
   - `.automated-task-type-badge` → `.comm-automated-task-type-badge`
   - `.automated-task-resolution-badge` → `.comm-automated-task-resolution-badge`
   - All resolution variants (sent, archived, scheduled)
   - `.automated-task-timestamp` → `.comm-automated-task-timestamp`
   - `.automated-task-footer` → `.comm-automated-task-footer`

2. **Update AutomatedTasksPanel.tsx:**
   Replace all automated-task-* class names with comm-automated-* equivalents

3. **Remove from CommunicationView.css:**
   Delete all duplicated automated task styles (lines ~749-833)

### Benefits
- Eliminates ~50 lines of duplicated CSS
- Ensures consistent styling across the communications module
- Simplifies maintenance (single source of truth)
- Prevents future inconsistencies
- Makes the AutomatedTasksPanel component easier to understand

### Additional Consolidation Opportunities
While reviewing, I also noticed:
- Both files define similar layout containers (though less duplicated)
- Global badge and button styles in index.css are properly used
- The duplication is primarily isolated to the automated task component styles

## Implementation Priority
**High** - This is a straightforward refactor with clear benefits and low risk, especially since it's confined to styling and doesn't affect functionality.