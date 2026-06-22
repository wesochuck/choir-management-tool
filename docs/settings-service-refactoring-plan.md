# Settings Service Refactoring Plan

**Target:** `src/services/settingsService.ts` — 646 lines → ~0 lines (replaced by domain files)

## Problem

`settingsService.ts` is a single-file monolith containing 15+ independent domains,
all sharing two generic helpers (`getSetting`, `upsertSetting`). Every consumer
imports from a single barrel that exposes everything, creating unnecessary coupling.
When any setting type changes, the file's edit distance is high.

## Split Overview

```
src/services/settings/
  core.ts                        ~50 lines   — AppSetting<T>, getSetting, upsertSetting, inFlightRequests
  types.ts                       ~interfaces only — re-exports from domain files for backward compat
  auditionSettings.ts            ~15 lines   — AuditionSettings, DEFAULT, get/save
  communicationSettings.ts       ~65 lines   — CommunicationSettings, DEFAULT, get/save (includes frontendUrl resolution)
  communicationConfig.ts         ~20 lines   — CommunicationConfig, DEFAULT, get/save (SMTP/Twilio)
  rosterSettings.ts              ~20 lines   — RosterSettings, DEFAULT, get/save
  musicLibrarySettings.ts        ~20 lines   — MusicLibrarySettings, MusicGenreDef, DEFAULT, get/save
  seatingSettings.ts             ~90 lines   — SectionDef, VoicePartDef, VoicePartSettings, FormationStrategyType,
                                                SeatingFormationDef, SeatingSettings, ALL defaults,
                                                get/saveSeatingSettings, get/saveVoicePartsAndSections,
                                                get/saveVoiceParts
  landingSettings.ts             ~45 lines   — LandingPageSettings, DEFAULT, get/save
  landingMedia.ts                ~50 lines   — getHeroImageUrl, saveHeroImage, getLogoUrl, saveLogo
  generalSettings.ts             ~30 lines   — get/saveChoirName, get/saveTimezone, get/saveHomepageUrl
  pollSettings.ts                ~12 lines   — PollSettings, DEFAULT, get/save
  ticketConfirmationSettings.ts  ~20 lines   — TicketConfirmationPageSettings, DEFAULT, get/save
  queueSettings.ts               ~10 lines   — queueSettingsService
```

The original file becomes a barrel re-export:

```ts
// src/services/settingsService.ts
export { settingsService } from './settings/core'; // no — settingsService stays in core.ts
```

Actually the cleaner approach is: `settingsService.ts` becomes a thin barrel that
re-exports everything needed by consumers, while each domain lives in its own file.

---

## Detailed Split

### `src/services/settings/core.ts`

Move from `settingsService.ts`:
- `AppSetting<T>` interface
- `inFlightRequests` dedup cache
- `getSetting<T>(key)` — generic fetch with dedup and 404 handling
- `upsertSetting<T>(key, value, isPublic)` — generic upsert
- `settingsService` object is **removed** — each domain exports its own functions

No domain interfaces, defaults, or get/save functions go here.

### `src/services/settings/types.ts`

A convenience barrel that imports and re-exports every setting interface and every
default constant. This lets existing imports like `import type { SectionDef } from '...'`
continue to resolve from `../../services/settingsService` if we keep a barrel there.

### Domain files (one per setting type)

Each file follows the same pattern:

```ts
// src/services/settings/auditionSettings.ts
import { getSetting, upsertSetting } from './core';

export interface AuditionSettings { ... }
export const DEFAULT_AUDITION_SETTINGS: AuditionSettings = { ... };

export async function getAuditionSettings(): Promise<AuditionSettings> { ... }
export async function saveAuditionSettings(value: AuditionSettings): Promise<void> { ... }
```

**No more `settingsService.getXxx()` / `settingsService.saveXxx()` namespace.**
Consumers call the named function directly:

```ts
// before
import { settingsService } from '../../services/settingsService';
await settingsService.saveCommunicationSettings(value);

// after
import { saveCommunicationSettings } from '../../services/settings/communicationSettings';
await saveCommunicationSettings(value);
```

### Special cases

**`seatingSettings.ts`** (90 lines estimated)
- Contains `SectionDef`, `VoicePartDef`, `VoicePartSettings`, `FormationStrategyType`,
  `SeatingFormationDef`, `SeatingSettings` interfaces
- `DEFAULT_SECTIONS`, `DEFAULT_VOICE_PARTS`, `DEFAULT_SEATING_SETTINGS`
- `getSeatingSettings`, `saveSeatingSettings`, `getVoicePartsAndSections`,
  `saveVoicePartsAndSections`, `getVoiceParts`, `saveVoiceParts`
- The `getSeatingSettings` function is the most complex: it cross-references voice
  part/section settings to sanitize formation data

**`communicationSettings.ts`** (65 lines estimated)
- `CommunicationSettings` interface + default
- `getCommunicationSettings` has frontendUrl resolution logic (window.location.origin fallback)
- `saveCommunicationSettings`

**`landingMedia.ts`** (50 lines estimated)
- Separate from `landingSettings.ts` because hero image and logo have different
  storage patterns (file uploads) vs plain setting values

**`generalSettings.ts`** (30 lines estimated)
- Plain get/save functions for `choir_name`, `timezone`, and `homepage_url` strings.

### Barrel file

`src/services/settingsService.ts` becomes:

```ts
// Re-export all types, defaults, and functions from domain files.
// This keeps existing imports working throughout the transition.

export { getSetting, upsertSetting } from './settings/core';
export type { AppSetting } from './settings/core';

export type { AuditionSettings } from './settings/auditionSettings';
export { DEFAULT_AUDITION_SETTINGS, getAuditionSettings, saveAuditionSettings } from './settings/auditionSettings';

export type { CommunicationSettings } from './settings/communicationSettings';
export { DEFAULT_COMMUNICATION_SETTINGS, getCommunicationSettings, saveCommunicationSettings } from './settings/communicationSettings';

export type { CommunicationConfig } from './settings/communicationConfig';
export { DEFAULT_COMMUNICATION_CONFIG, getCommunicationConfig, saveCommunicationConfig } from './settings/communicationConfig';

export type { RosterSettings } from './settings/rosterSettings';
export { DEFAULT_ROSTER_SETTINGS, getRosterSettings, saveRosterSettings } from './settings/rosterSettings';

export type { MusicGenreDef, MusicLibrarySettings } from './settings/musicLibrarySettings';
export { DEFAULT_MUSIC_LIBRARY_SETTINGS, getMusicLibrarySettings, saveMusicLibrarySettings } from './settings/musicLibrarySettings';

export type { SectionDef, VoicePartDef, VoicePartSettings, FormationStrategyType, SeatingFormationDef, SeatingSettings } from './settings/seatingSettings';
export { DEFAULT_SECTIONS, DEFAULT_VOICE_PARTS, DEFAULT_SEATING_SETTINGS, getSeatingSettings, saveSeatingSettings, getVoicePartsAndSections, saveVoicePartsAndSections, getVoiceParts, saveVoiceParts } from './settings/seatingSettings';

export type { LandingPageSettings } from './settings/landingSettings';
export { DEFAULT_LANDING_SETTINGS, getLandingSettings, saveLandingSettings } from './settings/landingSettings';

export { getHeroImageUrl, saveHeroImage, getLogoUrl, saveLogo } from './settings/landingMedia';

export { getChoirName, saveChoirName, getTimezone, saveTimezone, getHomepageUrl, saveHomepageUrl } from './settings/generalSettings';

export type { PollSettings } from './settings/pollSettings';
export { DEFAULT_POLL_SETTINGS, getPollSettings, savePollSettings } from './settings/pollSettings';

export type { TicketConfirmationPageSettings } from './settings/ticketConfirmationSettings';
export { DEFAULT_TICKET_CONFIRMATION_SETTINGS, getTicketConfirmationPageSettings, saveTicketConfirmationPageSettings } from './settings/ticketConfirmationSettings';

export { queueSettingsService } from './settings/queueSettings';

// Backward compat namespace for existing settingsService.getXxx callers
export const settingsService = {
  getAuditionSettings, saveAuditionSettings,
  getPollSettings, savePollSettings,
  getCommunicationSettings, saveCommunicationSettings,
  getCommunicationConfig, saveCommunicationConfig,
  getRosterSettings, saveRosterSettings,
  getMusicLibrarySettings, saveMusicLibrarySettings,
  getSeatingSettings, saveSeatingSettings,
  getChoirName, saveChoirName,
  getTimezone, saveTimezone,
  getHomepageUrl, saveHomepageUrl,
  getLandingSettings, saveLandingSettings,
  getHeroImageUrl, saveHeroImage,
  getLogoUrl, saveLogo
};

// Backward compat — remove this export once all callers are migrated
export { renderCommunicationTemplate } from '../lib/messageTemplates';
```

---

## Consumer Migration

Existing imports:

```ts
import { settingsService } from '../../services/settingsService';
await settingsService.getAuditionSettings();
await settingsService.saveSeatingSettings(value);
```

New imports:

```ts
import { getAuditionSettings } from '../../services/settings/auditionSettings';
import { saveSeatingSettings } from '../../services/settings/seatingSettings';
```

But **existing imports continue to work** through the barrel file. The barrel
re-exports everything from the domain files, including functions. So:

```ts
import { settingsService } from '../../services/settingsService';
```

still works if we also add:

```ts
export const settingsService = {
  getAuditionSettings,
  saveAuditionSettings,
  ...
};
```

This cleaner approach allows tree-shaking to handle unused imports. We provide
the `settingsService` namespace object in the barrel so existing imports like
`settingsService.getAuditionSettings()` do not break during the transition.

---

## Benefits

- **Mechanical split** — every domain is a small, focused file. Easy to review.
- **Reduced import coupling** — a view that only needs `getRosterSettings` no longer
  imports the entire seating/audition/landing stack.
- **Tree-shakeable** — Webpack/Vite can eliminate unused setting domains.
- **Testable** — each domain file can be tested in isolation.
- **No behavioral change** — all defaults, migration logic, and error handling preserved.

---

## Verification

After implementation:

```bash
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
rtk npx tsc --noEmit --pretty
rtk npx vitest run
```

No existing tests for `settingsService.ts` exist in `test/` — this is a pure
refactor with no logic changes, so test pass/fail should be unaffected.
