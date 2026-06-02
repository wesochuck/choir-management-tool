# AuditionModal Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `AuditionModal.tsx` to align with the project's established admin modal patterns (unified state, lifted dependencies, standardized styling) without changing existing functionality.

**Architecture:** 
- **Unified State**: Transition from individual state variables to a single `formData` object.
- **Dependency Injection**: Move data fetching (`performances`, `settings`) up to the parent view.
- **Helper Extraction**: Create pure functions for form hydration and dirty checking.
- **Style Synchronization**: Standardize tab layouts and colors to match `SingerModal.tsx`.

**Tech Stack:** React, TypeScript, PocketBase (Record Models).

---

### Task 1: Create Form Data Helpers

**Files:**
- Create: `src/lib/auditionForm.ts`

- [ ] **Step 1: Implement audition form utilities**
Define the initial state and mapping logic.

```typescript
import type { Audition, AuditionInput } from '../services/auditionService';

export const defaultAuditionInput: AuditionInput = {
  name: '',
  contact: '',
  status: 'New',
  notes: '',
  experience: '',
  requestedSlots: [],
};

/**
 * Hydrates form state from a record or defaults.
 */
export function auditionToFormData(audition: Audition | null, defaultPerformanceId?: string): AuditionInput {
  if (!audition) {
    return {
      ...defaultAuditionInput,
      performance: defaultPerformanceId || '',
    };
  }
  return {
    name: audition.name,
    contact: audition.contact,
    status: audition.status,
    voicePart: audition.voicePart || '',
    performance: audition.performance || '',
    experience: audition.experience || '',
    notes: audition.notes || '',
    requestedSlots: audition.requestedSlots || [],
    scheduledTimeSlot: audition.scheduledTimeSlot || '',
  };
}

/**
 * Checks if the current form differs from the initial record data.
 */
export function isAuditionFormDirty(formData: AuditionInput, initialData: Audition | null): boolean {
  const currentInitial = auditionToFormData(initialData);
  return JSON.stringify(formData) !== JSON.stringify(currentInitial);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auditionForm.ts
git commit -m "refactor: add audition form data helpers"
```

---

### Task 2: Refactor AuditionModal Props and State

**Files:**
- Modify: `src/components/admin/AuditionModal.tsx`

- [ ] **Step 1: Update interfaces and dependencies**
Add `performances` and `settings` to props and remove internal fetching.

```typescript
// Add to imports
import { auditionToFormData, isAuditionFormDirty, defaultAuditionInput } from '../../lib/auditionForm';
import type { AuditionSettings } from '../../services/settingsService';
import type { Event } from '../../services/eventService';

interface AuditionModalProps {
  audition: Audition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string | null, data: Partial<Audition>) => Promise<void>;
  // New props
  settings: AuditionSettings | null;
  performances: Event[];
}
```

- [ ] **Step 2: Unify state variables**
Replace the list of 10+ state variables with one `formData` object.

```typescript
export const AuditionModal: React.FC<AuditionModalProps> = ({ 
  audition, isOpen, onClose, onSave, settings, performances 
}) => {
  const [formData, setFormData] = useState<AuditionInput>(defaultAuditionInput);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'slots'>('info');

  // Time slot helper state (still needed for custom vs list)
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState('');
  const [customTimeVal, setCustomTimeVal] = useState('');
  const [isCustomTime, setIsCustomTime] = useState(false);

  // Hydration Effect
  useEffect(() => {
    if (!isOpen) return;
    const data = auditionToFormData(audition, settings?.defaultPerformanceId);
    setFormData(data);
    setActiveTab('info');

    // Handle scheduled time resolution
    const currentSlot = audition?.scheduledTimeSlot || '';
    const isSlotPredefined = currentSlot ? settings?.slots?.includes(currentSlot) : false;
    if (isSlotPredefined) {
      setScheduledTimeSlot(currentSlot);
      setIsCustomTime(false);
      setCustomTimeVal('');
    } else if (currentSlot) {
      setScheduledTimeSlot('__custom__');
      setCustomTimeVal(currentSlot);
      setIsCustomTime(true);
    } else {
      setScheduledTimeSlot('');
      setIsCustomTime(false);
      setCustomTimeVal('');
    }
  }, [audition, settings, isOpen]);

  const isDirty = useMemo(() => isAuditionFormDirty(formData, audition), [formData, audition]);
  // ...
```

- [ ] **Step 3: Update Form Fields and styles**
Standardize tab styling and update all `input`/`select` handlers to use `setFormData`.

```tsx
// Example change for name field
<input
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  // ...
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AuditionModal.tsx
git commit -m "refactor: unify AuditionModal state and dependency management"
```

---

### Task 3: Update Parent View

**Files:**
- Modify: `src/views/admin/AuditionsView.tsx`

- [ ] **Step 1: Pass settings and performances to modal**
Pass the state already being managed in `AuditionsView`.

```tsx
<AuditionModal
  audition={editingAudition}
  isOpen={isModalOpen}
  onClose={() => { setEditingAudition(null); setIsModalOpen(false); }}
  onSave={handleSaveAudition}
  settings={settings}
  performances={performances}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/admin/AuditionsView.tsx
git commit -m "refactor: provide modal dependencies from parent view"
```
