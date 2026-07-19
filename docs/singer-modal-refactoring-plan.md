# SingerModal Refactoring Plan

**Target:** `src/components/admin/SingerModal.tsx` — 696 lines → ~200 lines

## Problem

Single component mixing form state management, validation, password reset, 3 tabs,
and ~400 lines of JSX. The profile form fields are duplicated for create and edit modes.

## Split Overview

```
src/components/admin/singer-modal/
  useSingerForm.ts          ~80 lines   — form state, dirty tracking, submit/delete handlers
  SingerProfileForm.tsx     ~200 lines  — profile fields (photo, name, email, voice part, status, checkboxes, notes)
  SingerPasswordReset.tsx   ~30 lines   — password reset button + feedback
  SingerModalFooter.tsx     ~50 lines   — modal footer with cancel/save/delete
```

**Import note:** Extracted files at `src/components/admin/singer-modal/` need one extra
`../` segment. Original imports like `../../services/profileService` become
`../../../services/profileService`. Imports from `../ui` become `../../ui`.

---

## `src/components/admin/singer-modal/useSingerForm.ts`

Extract:

- `formData` state + `setFormData`
- `isSubmitting`, `isDeleting` loading states
- `initialData` → form initialization effect
- `isDirty` memo
- `handleClose` (with dirty check via dialog)
- `handleSubmit` (validation, email removal confirm, save)
- `handleDelete` (confirm + delete)
- `isValidEmail`, `validateEmailField`, `handleEmailChange`
- `handleResetPassword` handler
- `resetFeedback`, `isResettingPassword` state

Returns:

```ts
{
  formData: ProfileInput
  setFormData: Dispatch<SetStateAction<ProfileInput>>
  isSubmitting: boolean
  isDeleting: boolean
  isDirty: boolean
  initialData: Profile | null | undefined
  handleClose: () => Promise<void>
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  handleDelete: () => Promise<void>
  emailInputRef: RefObject<HTMLInputElement | null>
  validateEmailField: () => boolean
  handleEmailChange: (value: string) => void
  handleResetPassword: () => Promise<void>
  resetFeedback: string | null
  isResettingPassword: boolean
}
```

## Sub-components

### `SingerProfileForm.tsx` (lines 305–546 for edit, 570–691 for create)

Renders the form fields. Used in both create and edit modes.

Props:

```ts
{
  formData: ProfileInput
  setFormData: Dispatch<SetStateAction<ProfileInput>>
  voiceParts: VoicePartDef[]
  initialData?: Profile | null
  isSelf: boolean
  isAdmin: boolean
  emailInputRef: RefObject<HTMLInputElement | null>
  validateEmailField: () => boolean
  handleEmailChange: (value: string) => void
  handleResetPassword: () => Promise<void>
  resetFeedback: string | null
  isResettingPassword: boolean
}
```

Imports: `PhotoUploader` from `../../common/PhotoUploader`, `pb` from `../../../lib/pocketbase`

### `SingerPasswordReset.tsx` (lines 351–377)

The password reset button + feedback message.

### `SingerModalFooter.tsx`

The modal footer with Delete (conditional), Cancel, and Save buttons.

## Final `SingerModal.tsx`

```tsx
import { useState } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import { Modal, TabGroup, Tab, TabPanel } from '../ui';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useAuth } from '../../contexts/AuthContext';
import { SingerRsvpHistoryTab } from './SingerRsvpHistoryTab';
import { SingerPatronageHistoryTab } from './SingerPatronageHistoryTab';
import { SingerProfileForm } from './singer-modal/SingerProfileForm';
import { SingerModalFooter } from './singer-modal/SingerModalFooter';
import { useSingerForm } from './singer-modal/useSingerForm';

export const SingerModal = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
  const dialog = useDialog();
  const { voiceParts } = useVoiceParts();
  const { user } = useAuth();
  const form = useSingerForm({ isOpen, initialData, onClose, onSave, onDelete, dialog });
  const [activeTab, setActiveTab] = useState('profile');
  const isSelf = /* ... */;
  const isAdmin = /* ... */;

  return (
    <Modal title={initialData ? 'Edit Singer' : 'Add Singer'} footer={<SingerModalFooter ... />}>
      {initialData ? (
        <TabGroup>
          <TabPanel name="profile">
            <SingerProfileForm ... />
          </TabPanel>
          <TabPanel name="rsvps"><SingerRsvpHistoryTab ... /></TabPanel>
          <TabPanel name="patronage"><SingerPatronageHistoryTab ... /></TabPanel>
        </TabGroup>
      ) : (
        <SingerProfileForm ... />
      )}
    </Modal>
  );
};
```

## Lessons Learned from Previous Refactors

- **Strict Type Fallbacks:** When hook interfaces explicitly promise `Type | null` (like `initialData`), ensure any `.find()` or `?.` property access includes a strict `|| null` fallback. TypeScript will otherwise infer `Type | undefined` and fail compilation.
- **Closure Property Narrowing:** TypeScript does not narrow object properties across closure boundaries. If passing a conditionally present object property to an event handler within the modal footer, include an inline truthiness check (e.g., `onClick={() => form.formData && handler(form.formData)}`).
- **Explicit Event Typings:** When extracting components with form inputs (e.g., `SingerProfileForm`), explicitly type the `onChange` event parameters (e.g., `(e: React.ChangeEvent<HTMLInputElement>)`) and map iterators to avoid `implicit any` TypeScript errors.
- **Import Path Depth Validation:** When extracting files to `src/components/admin/singer-modal/`, carefully verify every import path. Ensure paths reaching `services`, `lib`, `hooks`, `contexts`, and `ui` have the correct number of `../` segments.

## Verification

```bash
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
rtk npx tsc --noEmit --pretty
rtk npx vitest run
```
