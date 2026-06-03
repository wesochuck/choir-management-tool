# Design Spec: Communication History Search

Add a server-side search capability to the Communication History section of the Admin panel, allowing administrators to filter sent and archived messages by subject, content, and type.

## 1. Goal
Provide a responsive, server-side filtered view of communication history that maintains existing pagination and message actions.

## 2. Architecture & Data Flow

### 2.1 Hook State (`useCommunicationLibrary.ts`)
- **`historySearchQuery`**: State for the debounced search term that drives API calls.
- **`refreshHistory(page, query)`**: Updated to accept an optional query.
- **`useEffect`**: Monitors `historySearchQuery` and `historyPage`. Resets page to 1 if the query changes.

### 2.2 Component Hierarchy
- **`CommunicationView`**: Parent state container.
- **`HistoryPanel`**: Passes search props down.
- **`MessageHistory`**: 
    - Maintains local `searchTerm` for immediate UI feedback.
    - Debounces updates to the parent (300ms).
    - Renders the search input and clear button.

## 3. Implementation Details

### 3.1 Secure Filter Construction
Use `pb.filter()` for safe parameterization of the search term:
```typescript
const baseFilter = "(status = 'Sent' || status = 'Archived')";
if (!query) return baseFilter;

return pb.filter(`(${baseFilter} && (subject ~ {:query} || content ~ {:query} || type ~ {:query}))`, {
  query: query.trim()
});
```

### 3.2 UI Components
- **Search Input**: Styled `input[type="text"]` with a "Clear" button.
- **Empty States**:
    - **No results**: "No messages found matching '[query]'. Try a different search term."
    - **No history**: "No messages logged yet."

## 4. Testing & Validation

### 4.1 Manual Test Cases
- [ ] Verify search by subject (partial match).
- [ ] Verify search by content (partial match).
- [ ] Verify search by type (e.g., "SMS", "Email").
- [ ] Verify that changing search resets pagination to page 1.
- [ ] Verify that clearing search restores the full history list.
- [ ] Verify that special characters (quotes, ampersands) do not break the filter.
- [ ] Verify that "Archived" messages are included in search results.
- [ ] Verify that "Draft" messages are NEVER included.

### 4.2 Automated Tests
- Update `test/communication.test.ts` or create a new test file to mock the `communicationService` and verify that the correct filter strings are passed based on search input.
