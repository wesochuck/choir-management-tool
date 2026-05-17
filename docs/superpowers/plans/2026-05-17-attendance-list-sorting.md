# Attendance List Sorting and Voice Part Separators Implementation Plan

We will add sorting capabilities to the check-in list, allowing admins to sort by last name or by voice part + last name, featuring elegant horizontal dividers between voice parts.

## Goal
Enhance roster lookup and check-in efficiency by providing two sort modes:
1. **Last Name (All Parts):** A strict alphabetical sort by last name across all active singers in each list section (unchecked and checked-in).
2. **Voice Part + Last Name:** Grouping singers by voice part (S1 -> S2 -> ... -> B2) and sorting by last name within each group, divided by beautiful horizontal voice part separators.

---

## User Review Required

> [!NOTE]
> **Aesthetic Design of separators:** The separators between voice parts will be subtle, featuring the capitalized voice part label on the left (e.g., **S1** in var-primary green) followed by a soft, premium line extending to the right. This maintains the clean, grid-like feeling of the card rows without adding clutter.

---

## Proposed Changes

### Component & View Layers

#### [MODIFY] [CheckInList.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/components/admin/CheckInList.tsx)
- Add `sortBy: 'lastName' | 'voicePart'` to `CheckInListProps`.
- Implement a helper to extract last name from a full name (splitting by whitespace and taking the last word).
- Implement custom sorting logic inside `notCheckedIn` and `checkedIn` `useMemo` blocks:
  - If `sortBy === 'lastName'`, sort strictly by last name.
  - If `sortBy === 'voicePart'`, sort by voice part order first (`S1` -> `S2` -> `A1` -> `A2` -> `T1` -> `T2` -> `B1` -> `B2`), and then by last name.
- When rendering both lists under `sortBy === 'voicePart'` mode:
  - Keep track of the voice part of the previous item.
  - If the current item's voice part differs from the previous one, render a clean, premium visual horizontal line (`hr`) with a voice part label (e.g. `S1`, `A2`) just before rendering the row card.

#### [MODIFY] [AttendanceView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/AttendanceView.tsx)
- Introduce a new state `sortBy` defaulting to `'lastName'` (or `'voicePart'`).
- In the filter card panel, add a new dropdown or segmented select element for **Sort By**:
  - Options: **Last Name** and **Voice Part + Last Name**.
- Pass the selected `sortBy` value down as a prop to the `<CheckInList />` component.

---

## Task Breakdown

### Task 1: Update CheckInList Sorting and Divider Logic

**Files:**
- Modify: `src/components/admin/CheckInList.tsx`

- [ ] **Step 1: Define updated CheckInListProps and Last Name helpers**
Add `sortBy` to `CheckInListProps` and implement name parsing:
```typescript
interface CheckInListProps {
  items: AttendanceItem[];
  onSetAttendance: (profileId: string, next: 'Present' | 'Absent' | 'Pending') => Promise<void>;
  onUpdateFolder: (profileId: string, folderNumber: string, folderReturned: boolean) => Promise<void>;
  onEdit: (profileId: string) => void;
  sortBy: 'lastName' | 'voicePart';
}

const getLastName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
};

const compareLastNames = (a: string, b: string): number => {
  const lastA = getLastName(a);
  const lastB = getLastName(b);
  const cmp = lastA.localeCompare(lastB);
  if (cmp !== 0) return cmp;
  return a.localeCompare(b);
};

const voicePartOrder: Record<string, number> = {
  'S1': 1, 'S2': 2, 'A1': 3, 'A2': 4,
  'T1': 5, 'T2': 6, 'B1': 7, 'B2': 8
};
```

- [ ] **Step 2: Update the sorting useMemos**
Rewrite the lists sorting logic:
```typescript
  const notCheckedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance !== 'Present')
      .sort((a, b) => {
        if (sortBy === 'voicePart') {
          const partA = voicePartOrder[a.voicePart] ?? 99;
          const partB = voicePartOrder[b.voicePart] ?? 99;
          if (partA !== partB) return partA - partB;
        }
        return compareLastNames(a.name, b.name);
      });
  }, [items, sortBy]);

  const checkedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance === 'Present')
      .sort((a, b) => {
        if (sortBy === 'voicePart') {
          const partA = voicePartOrder[a.voicePart] ?? 99;
          const partB = voicePartOrder[b.voicePart] ?? 99;
          if (partA !== partB) return partA - partB;
        }
        return compareLastNames(a.name, b.name);
      });
  }, [items, sortBy]);
```

- [ ] **Step 3: Render Voice Part Dividers dynamically**
Write a helper to render a list of row items, placing a gorgeous divider with voice part indicator between changes:
```tsx
  const renderListWithHeaders = (listItems: AttendanceItem[]) => {
    let lastVoicePart = '';
    
    return listItems.map((item) => {
      const showHeader = sortBy === 'voicePart' && item.voicePart !== lastVoicePart;
      if (showHeader) {
        lastVoicePart = item.voicePart;
      }
      
      return (
        <React.Fragment key={item.id}>
          {showHeader && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                margin: '18px 0 8px 0', 
                gap: '12px',
                width: '100%' 
              }}
            >
              <span 
                style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 800, 
                  color: 'var(--primary-deep)', 
                  letterSpacing: '0.05em' 
                }}
              >
                {item.voicePart}
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(74, 117, 89, 0.15)' }}></div>
            </div>
          )}
          <CheckInRow 
            item={item} 
            onSetAttendance={onSetAttendance}
            onUpdateFolder={onUpdateFolder}
            onEdit={onEdit}
          />
        </React.Fragment>
      );
    });
  };
```

---

### Task 2: Implement Sort Controls in AttendanceView

**Files:**
- Modify: `src/views/admin/AttendanceView.tsx`

- [ ] **Step 1: Add State & Dropdown Control**
Add `sortBy` state to `AttendanceView`:
```typescript
  const [sortBy, setSortBy] = useState<'lastName' | 'voicePart'>('lastName');
```
Inside the filters card in [AttendanceView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/AttendanceView.tsx), render a **Sort By** dropdown matching the other filters:
```tsx
          {/* Sort By Filter */}
          <div className="flex-col" style={{ width: '180px', gap: '6px' }}>
            <label className="text-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part + Last Name</option>
            </select>
          </div>
```

Pass `sortBy={sortBy}` down to `<CheckInList />`.

---

## Verification Plan

### Automated Verification
- Run `npx tsc --noEmit` to verify type safety and compilation.

### Manual / Browser Verification
- Load **Attendance Check-in**.
- Switch **Sort By** dropdown from **Last Name** to **Voice Part + Last Name**.
- Verify that singers are grouped in sections by voice parts (S1, S2, etc.).
- Verify that thin, elegant horizontal lines appear separating the sections, labeled with the voice part on the left.
- Verify that within each voice part, names are strictly sorted alphabetically by last name (e.g., "Doe, Jane" before "Smith, John").
- Verify that checked-in partition at the bottom also respects this grouping, displaying its own elegant headers for voice parts when using that sort mode.
