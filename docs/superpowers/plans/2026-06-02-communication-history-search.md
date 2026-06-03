# Communication History Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side search to the Communication History area, allowing administrators to filter sent and archived messages by subject, content, and type.

**Architecture:** Use debounced local state in the `MessageHistory` component to drive a `historySearchQuery` in the `useCommunicationLibrary` hook. The hook will construct a parameterized PocketBase filter string using `pb.filter()` and refresh the history list, resetting pagination to page 1 on query changes.

**Tech Stack:** React (TypeScript), PocketBase SDK, Tailwind-like CSS (Vanilla CSS).

---

### Task 1: Update `useCommunicationLibrary` Hook

**Files:**
- Modify: `src/views/admin/communications/useCommunicationLibrary.ts`

- [ ] **Step 1: Add search state and update refresh logic**

```typescript
// Add to state declarations
const [historySearchQuery, setHistorySearchQuery] = useState('');

// Update refreshHistory to accept search query
const refreshHistory = useCallback(async (pageToFetch: number, query = '') => {
  try {
    const baseFilter = "(status = 'Sent' || status = 'Archived')";
    let filterString = baseFilter;
    
    if (query.trim()) {
      // Use pb.filter for safe parameterization
      filterString = pb.filter(`(${baseFilter} && (subject ~ {:query} || content ~ {:query} || type ~ {:query}))`, {
        query: query.trim()
      });
    }

    const result = await communicationService.getMessagesPaginated(
      pageToFetch,
      5,
      filterString
    );
    setHistory(result.items);
    setTotalPages(result.totalPages);
  } catch (err) {
    console.error('Failed to refresh message history', err);
  }
}, []);

// Update effects to include historySearchQuery
useEffect(() => {
  void refreshHistory(historyPage, historySearchQuery);
}, [historyPage, historySearchQuery, refreshHistory]);

// Reset to page 1 when search changes
useEffect(() => {
  setHistoryPage(1);
}, [historySearchQuery]);

// Include in return object
return {
  // ... existing
  historySearchQuery,
  setHistorySearchQuery,
  // ...
};
```

- [ ] **Step 2: Commit hook changes**

```bash
git add src/views/admin/communications/useCommunicationLibrary.ts
git commit -m "feat(comm): add history search state and filter logic to useCommunicationLibrary"
```

---

### Task 2: Update Component Passthroughs

**Files:**
- Modify: `src/views/admin/CommunicationView.tsx`
- Modify: `src/views/admin/communications/HistoryPanel.tsx`

- [ ] **Step 1: Pass search props through CommunicationView**

```typescript
// In CommunicationView.tsx
const {
  // ...
  historySearchQuery,
  setHistorySearchQuery,
} = useCommunicationLibrary();

// ...
<HistoryPanel
  // ...
  historySearchQuery={historySearchQuery}
  onHistorySearchChange={setHistorySearchQuery}
/>
```

- [ ] **Step 2: Pass search props through HistoryPanel**

```typescript
// In HistoryPanel.tsx
interface HistoryPanelProps {
  // ...
  historySearchQuery: string;
  onHistorySearchChange: (query: string) => void;
}

// ...
<MessageHistory
  // ...
  historySearchQuery={historySearchQuery}
  onHistorySearchChange={onHistorySearchChange}
/>
```

- [ ] **Step 3: Commit passthrough changes**

```bash
git add src/views/admin/CommunicationView.tsx src/views/admin/communications/HistoryPanel.tsx
git commit -m "feat(comm): pass history search props through view hierarchy"
```

---

### Task 3: Implement Search UI in `MessageHistory`

**Files:**
- Modify: `src/components/admin/MessageHistory.tsx`

- [ ] **Step 1: Add search UI and debounced logic**

```typescript
// Update props
interface MessageHistoryProps {
  // ...
  historySearchQuery: string;
  onHistorySearchChange: (query: string) => void;
}

export function MessageHistory({
  // ...
  historySearchQuery,
  onHistorySearchChange,
}: MessageHistoryProps) {
  // Local state for immediate feedback
  const [searchTerm, setSearchTerm] = useState(historySearchQuery);

  // Debounce sync to parent
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchTerm !== historySearchQuery) {
        onHistorySearchChange(searchTerm);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm, historySearchQuery, onHistorySearchChange]);

  // Sync back if parent state changes (e.g. cleared elsewhere)
  useEffect(() => {
    setSearchTerm(historySearchQuery);
  }, [historySearchQuery]);

  return (
    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
      {/* Search Input Row */}
      <div className="flex-row" style={{ gap: 'var(--space-sm)', marginBottom: '4px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="input"
            placeholder="Search message history (subject, content, type)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingRight: searchTerm ? '32px' : '12px' }}
          />
          {searchTerm && (
            <button
              type="button"
              className="btn-close"
              onClick={() => {
                setSearchTerm('');
                onHistorySearchChange('');
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '1.2rem',
                lineHeight: 1
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <AppCard noPadding>
        {/* ... existing map ... */}
        {history.length === 0 && (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <p className="text-muted">
              {historySearchQuery 
                ? `No messages found matching "${historySearchQuery}".` 
                : "No messages logged yet."}
            </p>
          </div>
        )}
      </AppCard>
      {/* ... pagination ... */}
    </div>
  );
}
```

- [ ] **Step 2: Commit UI changes**

```bash
git add src/components/admin/MessageHistory.tsx
git commit -m "feat(comm): implement debounced search UI in MessageHistory"
```

---

### Task 4: Verification

- [ ] **Step 1: Verify search functionality**
Run the app and manually test:
1. Type a known subject fragment (e.g., "Rehearsal").
2. Observe 300ms debounce before results update.
3. Verify pagination count updates to reflect filtered total.
4. Click "X" to clear and verify full history returns.
5. Search for a non-existent term and verify "No messages found..." message.

- [ ] **Step 2: Run existing tests to ensure no regressions**

Run: `npm test test/communication.test.ts`
Expected: PASS
