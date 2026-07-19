# Public Chorus Landing Page & History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public chorus landing page at `/` and history page at `/history`, move the dashboard to `/dashboard`, and add admin-editable content fields.

**Architecture:** Public views render without auth and fetch settings via the existing `settingsService` and past performances via a restricted client-side query. Landing page content (headlines, about text, history text, contact email) is stored as a single JSON object in `appSettings` under key `landingSettings`. The hero image reuses the `saveLogo` file-upload pattern with key `landingHeroImage`. Markdown is rendered with `marked` and sanitized with `DOMPurify`.

**Tech Stack:** React, TypeScript, PocketBase SDK, EasyMDE (via MarkdownEditor), Tailwind CSS, `marked`, `dompurify`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/authRedirect.ts` | Add `/` and `/history` to public route prefixes |
| `src/App.tsx` | Add `/`, `/history`, `/dashboard` routes; update fallback |
| `src/views/singer/ProfileView.tsx` | Update `backTo` prop |
| `src/views/singer/SeatingFinderView.tsx` | Update `backTo` prop |
| `src/services/settingsService.ts` | Add `LandingPageSettings` type, `getLandingSettings()`, `saveLandingSettings()`, `getHeroImageUrl()`, `saveHeroImage()` |
| `src/services/eventService.ts` | Add `getPastPerformances()` |
| `src/components/admin/LandingPageSettingsPanel.tsx` | **New**: Admin editor for hero image + landing page text fields |
| `src/views/admin/SettingsView.tsx` | Integrate `LandingPageSettingsPanel` |
| `test/codebaseIntegrity.test.ts` | Add `DOMPurify.sanitize` as recognized guard |
| `src/views/PublicLandingView.tsx` | **New**: Public landing page |
| `src/views/PublicHistoryView.tsx` | **New**: Public history page |
| `test/services/settingsService.test.ts` | **New**: Tests for landing settings + markdown sanitization |
| `test/routing/publicLandingRoutes.test.tsx` | **New**: Route recognition tests |
| `test/views/PublicLandingView.test.tsx` | **New**: View smoke tests |

---

### Task 1: Add public routes to `authRedirect.ts`

**Files:**
- Modify: `src/lib/authRedirect.ts`

- [ ] **Step 1: Read the current `PUBLIC_ROUTE_PREFIXES`**

Read `src/lib/authRedirect.ts` to confirm the current array.

- [ ] **Step 2: Add `/` and `/history` to `PUBLIC_ROUTE_PREFIXES`**

```ts
const PUBLIC_ROUTE_PREFIXES = [
  '/',
  '/history',
  '/login',
  '/reset-password',
  '/auditions',
  '/rsvp',
  '/poll',
  '/unsubscribe',
  '/player',
] as const;
```

- [ ] **Step 3: Verify with codebase integrity test**

Run: `rtk npx vitest run test/codebaseIntegrity.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/authRedirect.ts
git commit -m "feat: add / and /history to public route prefixes"
```

---

### Task 2: Update routes in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Read `App.tsx`** to find the import block and `<Routes>` block.

- [ ] **Step 2: Add lazy imports for new public views**

```tsx
const PublicLandingView = lazyWithReload(() => import('./views/PublicLandingView'));
const PublicHistoryView = lazyWithReload(() => import('./views/PublicHistoryView'));
```

- [ ] **Step 3: Add `FallbackRoute` component**

```tsx
function FallbackRoute() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/'} replace />;
}
```

- [ ] **Step 4: Add routes and update catch-all**

```tsx
<Route path="/" element={<PublicLandingView />} />
<Route path="/history" element={<PublicHistoryView />} />
<Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
```
Replace `*` catch-all:
```tsx
<Route path="*" element={<FallbackRoute />} />
```

- [ ] **Step 5: Verify build compiles**

Run: `rtk npx tsc --noEmit`
Expected: FAIL — import errors for missing `PublicLandingView` and `PublicHistoryView` (expected)

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /, /history, /dashboard routes and fallback redirect"
```

---

### Task 3: Update `backTo` props from `/` to `/dashboard`

**Files:**
- Modify: `src/App.tsx` (admin routes — ~16 occurrences of `backTo="/"`)
- Modify: `src/views/singer/ProfileView.tsx` (line ~212)
- Modify: `src/views/singer/SeatingFinderView.tsx` (line ~228)

- [ ] **Step 1: Update all `backTo="/"` to `backTo="/dashboard"`** in the three files. The `/admin/events/:eventId/roster` route uses `backTo="/admin/events"` and is unchanged.

- [ ] **Step 2: Verify no remaining `backTo="/"` in admin/singer files**

Run: `rtk rg 'backTo="/"' src/`
Expected: No results

- [ ] **Step 3: Run codebase integrity test**

Run: `rtk npx vitest run test/codebaseIntegrity.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/views/singer/ProfileView.tsx src/views/singer/SeatingFinderView.tsx
git commit -m "feat: update backTo props to /dashboard"
```

---

### Task 4: Install `marked` + `dompurify` and update integrity test

**Files:**
- Install: `marked`, `dompurify` (npm packages)
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Install packages**

```bash
rtk npm install marked dompurify
```

- [ ] **Step 2: Verify install**

Run: `rtk npx tsc --noEmit`
Expected: PASS (no type errors from new packages — both ship their own types)

- [ ] **Step 3: Read the integrity test's `dangerouslySetInnerHTML` check**

Read `test/codebaseIntegrity.test.ts`, find the section that enforces `dangerouslySetInnerHTML` must be wrapped in `sanitizeHtml()` (around lines 255-294 based on earlier exploration).

- [ ] **Step 4: Add `DOMPurify.sanitize` as a recognized guard**

The check looks for lines containing `dangerouslySetInnerHTML` and verifies that `sanitizeHtml(` appears somewhere before or on that line. Add `DOMPurify.sanitize(` as an alternative guard. Without reading the exact regex, the change should make both `sanitizeHtml(` and `DOMPurify.sanitize(` pass the guard check.

- [ ] **Step 5: Run the integrity test to confirm it passes with the updated guard**

Run: `rtk npx vitest run test/codebaseIntegrity.test.ts`
Expected: PASS (no violations, since no views use `DOMPurify.sanitize` yet)

- [ ] **Step 6: Run npm audit**

```bash
rtk npm audit --audit-level=high
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json test/codebaseIntegrity.test.ts
git commit -m "feat: add marked and dompurify for safe markdown rendering"
```

---

### Task 5: Add `LandingPageSettings` types and service methods

**Files:**
- Modify: `src/services/settingsService.ts`

- [ ] **Step 1: Read `src/services/settingsService.ts`** to understand existing patterns.

- [ ] **Step 2: Add `LandingPageSettings` interface and defaults**

Insert after the existing type definitions (e.g., after `AuditionSettings`):

```ts
export interface LandingPageSettings {
  heroHeadline: string;
  heroSubtitle: string;
  aboutUsText: string;
  historyText: string;
  contactEmail: string;
}

export const DEFAULT_LANDING_SETTINGS: LandingPageSettings = {
  heroHeadline: 'Welcome to Our Choir',
  heroSubtitle: 'Voices united in harmony.',
  aboutUsText: '',
  historyText: '',
  contactEmail: '',
};
```

- [ ] **Step 3: Add `getLandingSettings` method**

Insert inside the `settingsService` object literal:

```ts
async getLandingSettings(): Promise<LandingPageSettings> {
  const stored = await getSetting<LandingPageSettings>('landingSettings');
  return stored ?? { ...DEFAULT_LANDING_SETTINGS };
},
```

- [ ] **Step 4: Add `saveLandingSettings` method**

```ts
async saveLandingSettings(value: LandingPageSettings): Promise<void> {
  await upsertSetting('landingSettings', value, true);
},
```

- [ ] **Step 5: Add `getHeroImageUrl` method**

Modeled on the existing `getLogoUrl`:

```ts
async getHeroImageUrl(): Promise<string | null> {
  try {
    const record = await pb.collection('appSettings').getFirstListItem<RecordModel>(
      pb.filter('key = {:key}', { key: 'landingHeroImage' })
    );
    const filename = record['logo'] as string | undefined;
    if (!filename) return null;
    return pb.files.getURL(record, filename);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) return null;
    throw err;
  }
},
```

- [ ] **Step 6: Add `saveHeroImage` method**

Modeled on the existing `saveLogo`:

```ts
async saveHeroImage(file: File | null): Promise<void> {
  const key = 'landingHeroImage';
  let record: RecordModel;
  try {
    record = await pb.collection('appSettings').getFirstListItem<RecordModel>(
      pb.filter('key = {:key}', { key })
    );
  } catch (err: unknown) {
    if (!(err && typeof err === 'object' && 'status' in err && err.status === 404)) {
      throw err;
    }
    record = await pb.collection('appSettings').create({
      key,
      value: 'heroImage',
      isPublic: true,
    });
  }
  const formData = new FormData();
  formData.append('logo', file ?? '');
  await pb.collection('appSettings').update(record.id, formData);
},
```

- [ ] **Step 7: Run tsc**

Run: `rtk npx tsc --noEmit`

- [ ] **Step 8: Commit**

```bash
git add src/services/settingsService.ts
git commit -m "feat: add LandingPageSettings type and service methods"
```

---

### Task 6: Add `getPastPerformances` to event service

**Files:**
- Modify: `src/services/eventService.ts`

- [ ] **Step 1: Read `eventService.ts`** for existing query patterns.

- [ ] **Step 2: Add `getPastPerformances` method**

Insert inside the `eventService` object literal:

```ts
async getPastPerformances(): Promise<Event[]> {
  return await pb.collection('events').getFullList<Event>({
    filter: 'type = "Performance" && date < @now && isArchived != true',
    sort: '-date',
    perPage: 5,
    fields: 'id,collectionId,collectionName,title,date,venue,publicDetails,eventGraphic,expand.venue',
    expand: 'venue',
  });
},
```

- [ ] **Step 3: Run tsc**

Run: `rtk npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/services/eventService.ts
git commit -m "feat: add getPastPerformances to eventService"
```

---

### Task 7: Create `LandingPageSettingsPanel` component

**Files:**
- Create: `src/components/admin/LandingPageSettingsPanel.tsx`

- [ ] **Step 1: Read the existing `MarkdownEditor` component** (`src/components/common/MarkdownEditor.tsx`) to understand its API.

- [ ] **Step 2: Read the logo upload UI in `SettingsView.tsx`** (lines ~194-233) for the file input + preview + remove pattern.

- [ ] **Step 3: Create `LandingPageSettingsPanel.tsx`**

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { MarkdownEditor } from '../common/MarkdownEditor';
import { AppCard } from '../common/AppCard';
import { Button } from '../common/Button';
import { settingsService, LandingPageSettings, DEFAULT_LANDING_SETTINGS } from '../../services/settingsService';
import type EasyMDE from 'easymde';

interface LandingPageSettingsPanelProps {
  onDirtyChange: (isDirty: boolean) => void;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

export function LandingPageSettingsPanel({
  onDirtyChange,
  isSaving,
  onSave,
  onDiscard,
}: LandingPageSettingsPanelProps) {
  const [settings, setSettings] = useState<LandingPageSettings>({ ...DEFAULT_LANDING_SETTINGS });
  const [initialSettings, setInitialSettings] = useState<LandingPageSettings>({ ...DEFAULT_LANDING_SETTINGS });
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [initialHeroImageUrl, setInitialHeroImageUrl] = useState<string | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImageRemoved, setHeroImageRemoved] = useState(false);
  const [loading, setLoading] = useState(true);
  const aboutRef = useRef<EasyMDE | null>(null);
  const historyRef = useRef<EasyMDE | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, imgUrl] = await Promise.all([
          settingsService.getLandingSettings(),
          settingsService.getHeroImageUrl(),
        ]);
        setSettings(s);
        setInitialSettings(s);
        setHeroImageUrl(imgUrl);
        setInitialHeroImageUrl(imgUrl);
      } catch (err: unknown) {
        console.error('Failed to load landing page settings', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const dirty =
      settings.heroHeadline !== initialSettings.heroHeadline ||
      settings.heroSubtitle !== initialSettings.heroSubtitle ||
      settings.aboutUsText !== initialSettings.aboutUsText ||
      settings.historyText !== initialSettings.historyText ||
      settings.contactEmail !== initialSettings.contactEmail ||
      heroImageFile !== null ||
      heroImageRemoved ||
      heroImageUrl !== initialHeroImageUrl;
    onDirtyChange(dirty);
  }, [settings, initialSettings, heroImageFile, heroImageRemoved, heroImageUrl, initialHeroImageUrl, onDirtyChange]);

  const handleChange = (field: keyof LandingPageSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleHeroFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB.');
      return;
    }
    setHeroImageFile(file);
    setHeroImageRemoved(false);
    setHeroImageUrl(URL.createObjectURL(file));
  };

  const handleRemoveHero = () => {
    setHeroImageFile(null);
    setHeroImageRemoved(true);
    setHeroImageUrl(null);
    const fileInput = document.getElementById('hero-image-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSave = async () => {
    await settingsService.saveLandingSettings(settings);
    if (heroImageRemoved) {
      await settingsService.saveHeroImage(null);
    } else if (heroImageFile) {
      await settingsService.saveHeroImage(heroImageFile);
    }
    setInitialSettings({ ...settings });
    setInitialHeroImageUrl(heroImageUrl);
    setHeroImageFile(null);
    setHeroImageRemoved(false);
    onSave();
  };

  const handleDiscard = () => {
    setSettings({ ...initialSettings });
    setHeroImageUrl(initialHeroImageUrl);
    setHeroImageFile(null);
    setHeroImageRemoved(false);
    aboutRef.current?.value(initialSettings.aboutUsText);
    historyRef.current?.value(initialSettings.historyText);
    onDiscard();
  };

  if (loading) return null;

  return (
    <AppCard title="Public Landing Page">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Hero Image</label>
          {heroImageUrl && (
            <div className="mb-2">
              <img src={heroImageUrl} alt="Hero" className="max-h-48 rounded border" />
            </div>
          )}
          <div className="flex gap-2">
            <input
              id="hero-image-input"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleHeroFileChange}
              className="text-sm"
            />
            {heroImageUrl && (
              <Button variant="secondary" onClick={handleRemoveHero} disabled={isSaving}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">Recommended: 1200x600px. Max 5 MB.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hero Headline</label>
          <input
            type="text"
            value={settings.heroHeadline}
            onChange={e => handleChange('heroHeadline', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-input text-text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hero Subtitle</label>
          <input
            type="text"
            value={settings.heroSubtitle}
            onChange={e => handleChange('heroSubtitle', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-input text-text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">About Us Text</label>
          <MarkdownEditor
            value={settings.aboutUsText}
            onChange={v => handleChange('aboutUsText', v)}
            instanceRef={aboutRef}
            minHeight="200px"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">History Text</label>
          <MarkdownEditor
            value={settings.historyText}
            onChange={v => handleChange('historyText', v)}
            instanceRef={historyRef}
            minHeight="200px"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact Email</label>
          <input
            type="email"
            value={settings.contactEmail}
            onChange={e => handleChange('contactEmail', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-input text-text"
            placeholder="contact@example.com"
          />
        </div>
      </div>
    </AppCard>
  );
}
```

- [ ] **Step 4: Run tsc**

Run: `rtk npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/LandingPageSettingsPanel.tsx
git commit -m "feat: add LandingPageSettingsPanel admin editor"
```

---

### Task 8: Integrate `LandingPageSettingsPanel` into `SettingsView`

**Files:**
- Modify: `src/views/admin/SettingsView.tsx`

- [ ] **Step 1: Read `SettingsView.tsx`** for structure and import patterns.

- [ ] **Step 2: Add import**

```tsx
import { LandingPageSettingsPanel } from '../../components/admin/LandingPageSettingsPanel';
```

- [ ] **Step 3: Add `landingDirty` state and insert panel**

```tsx
const [landingDirty, setLandingDirty] = useState(false);
const isDirty = calculateSettingsDirty(/* existing */) || landingDirty;
```

Insert in the render tree (after Timezone card, before Queue Webhook card):

```tsx
<LandingPageSettingsPanel
  onDirtyChange={(dirty) => setLandingDirty(dirty)}
  isSaving={isSaving}
  onSave={async () => {}}
  onDiscard={() => setLandingDirty(false)}
/>
```

- [ ] **Step 4: Run tsc**

Run: `rtk npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/SettingsView.tsx
git commit -m "feat: integrate LandingPageSettingsPanel into SettingsView"
```

---

### Task 9: Create `PublicLandingView` (using `marked` + `DOMPurify`)

**Files:**
- Create: `src/views/PublicLandingView.tsx`

- [ ] **Step 1: Read `PublicTicketListView.tsx`** for the public view patterns (layout, loading, error states).

- [ ] **Step 2: Create `PublicLandingView.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAuth } from '../contexts/AuthContext';
import { settingsService } from '../services/settingsService';
import { eventService } from '../services/eventService';
import { useChoirName } from '../hooks/useChoirName';
import { PublicLogo } from '../components/common/PublicLogo';
import { Spinner } from '../components/common/Spinner';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/common/Button';
import { formatInTimezone } from '../lib/dates';
import type { LandingPageSettings } from '../services/settingsService';
import type { Event } from '../services/eventService';

function PublicLandingView() {
  const { user } = useAuth();
  const choirName = useChoirName();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [performances, setPerformances] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, imgUrl, perfs] = await Promise.all([
          settingsService.getLandingSettings(),
          settingsService.getHeroImageUrl(),
          eventService.getPastPerformances(),
        ]);
        setSettings(s);
        setHeroImageUrl(imgUrl);
        setPerformances(perfs);
      } catch (err: unknown) {
        console.error('Failed to load landing page data', err);
        setError('Unable to load page content. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted">{error || 'Unable to load page.'}</p>
      </div>
    );
  }

  const aboutHtml = settings.aboutUsText
    ? DOMPurify.sanitize(marked.parse(settings.aboutUsText, { async: false }) as string)
    : '';

  return (
    <div className="min-h-screen bg-bg">
      <header className="no-print sticky top-0 z-40 bg-bg border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <PublicLogo size="sm" />
            <span className="text-lg font-semibold text-text">{choirName || 'Choir'}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/tickets" className="text-sm text-text-muted hover:text-text">Tickets</Link>
            <Link to="/donate" className="text-sm text-text-muted hover:text-text">Donate</Link>
            <Link to="/auditions" className="text-sm text-text-muted hover:text-text">Auditions</Link>
            <Link to="/history" className="text-sm text-text-muted hover:text-text">History</Link>
            {user ? (
              <Link to="/dashboard">
                <Button variant="secondary" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">Login</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section
          className="relative flex items-center justify-center text-center py-24 px-6"
          style={{
            backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '400px',
          }}
        >
          <div className={`max-w-3xl ${heroImageUrl ? 'bg-black/50 rounded-lg p-8' : ''}`}>
            <h1 className={`text-4xl font-bold mb-4 ${heroImageUrl ? 'text-white' : 'text-text'}`}>
              {settings.heroHeadline}
            </h1>
            <p className={`text-xl ${heroImageUrl ? 'text-gray-200' : 'text-text-muted'}`}>
              {settings.heroSubtitle}
            </p>
          </div>
        </section>

        {settings.aboutUsText && (
          <section className="max-w-3xl mx-auto px-6 py-16">
            <AppCard title="About Us">
              <div
                className="prose prose-sm max-w-none text-text"
                dangerouslySetInnerHTML={{ __html: aboutHtml }}
              />
            </AppCard>
          </section>
        )}

        {performances.length > 0 && (
          <section className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-bold text-text mb-6">Past Performances</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {performances.map((perf) => {
                const venueName = perf.expand?.venue && typeof perf.expand.venue === 'object' && 'name' in perf.expand.venue
                  ? (perf.expand.venue as { name: string }).name
                  : '';
                const graphicUrl = perf.eventGraphic
                  ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/${perf.collectionName}/${perf.id}/${perf.eventGraphic}`
                  : null;

                return (
                  <AppCard key={perf.id} title={perf.title} subtitle={formatInTimezone(perf.date, 'America/New_York', 'MMM d, yyyy')}>
                    {graphicUrl && (
                      <img src={graphicUrl} alt={perf.title} className="w-full h-40 object-cover rounded mb-3" />
                    )}
                    {venueName && <p className="text-sm text-text-muted mb-2">{venueName}</p>}
                    {perf.publicDetails && (
                      <div
                        className="text-sm text-text"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(marked.parse(perf.publicDetails, { async: false }) as string),
                        }}
                      />
                    )}
                  </AppCard>
                );
              })}
            </div>
          </section>
        )}

        {settings.contactEmail && (
          <section className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-text mb-4">Contact Us</h2>
            <p className="text-text-muted">
              <a href={`mailto:${settings.contactEmail}`} className="text-primary hover:underline">
                {settings.contactEmail}
              </a>
            </p>
          </section>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-text-muted">
        {choirName && <p>&copy; {new Date().getFullYear()} {choirName}</p>}
      </footer>
    </div>
  );
}

export default PublicLandingView;
```

- [ ] **Step 3: Run tsc**

Run: `rtk npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/views/PublicLandingView.tsx
git commit -m "feat: add PublicLandingView with marked + DOMPurify"
```

---

### Task 10: Create `PublicHistoryView` (using `marked` + `DOMPurify`)

**Files:**
- Create: `src/views/PublicHistoryView.tsx`

- [ ] **Step 1: Create `PublicHistoryView.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAuth } from '../contexts/AuthContext';
import { settingsService } from '../services/settingsService';
import { useChoirName } from '../hooks/useChoirName';
import { PublicLogo } from '../components/common/PublicLogo';
import { Spinner } from '../components/common/Spinner';
import { Button } from '../components/common/Button';
import type { LandingPageSettings } from '../services/settingsService';

function PublicHistoryView() {
  const { user } = useAuth();
  const choirName = useChoirName();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await settingsService.getLandingSettings();
        setSettings(s);
      } catch (err: unknown) {
        console.error('Failed to load history page data', err);
        setError('Unable to load page content. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted">{error || 'Unable to load page.'}</p>
      </div>
    );
  }

  const historyHtml = settings.historyText
    ? DOMPurify.sanitize(marked.parse(settings.historyText, { async: false }) as string)
    : '';

  return (
    <div className="min-h-screen bg-bg">
      <header className="no-print sticky top-0 z-40 bg-bg border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <PublicLogo size="sm" />
            <span className="text-lg font-semibold text-text">{choirName || 'Choir'}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/tickets" className="text-sm text-text-muted hover:text-text">Tickets</Link>
            <Link to="/donate" className="text-sm text-text-muted hover:text-text">Donate</Link>
            <Link to="/auditions" className="text-sm text-text-muted hover:text-text">Auditions</Link>
            <Link to="/history" className="text-sm font-medium text-text">History</Link>
            {user ? (
              <Link to="/dashboard">
                <Button variant="secondary" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">Login</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-text mb-8">Our History</h1>
        {historyHtml ? (
          <div
            className="prose prose-sm max-w-none text-text"
            dangerouslySetInnerHTML={{ __html: historyHtml }}
          />
        ) : (
          <p className="text-text-muted italic">No history has been published yet.</p>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-text-muted">
        {choirName && <p>&copy; {new Date().getFullYear()} {choirName}</p>}
      </footer>
    </div>
  );
}

export default PublicHistoryView;
```

- [ ] **Step 2: Run tsc**

Run: `rtk npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/views/PublicHistoryView.tsx
git commit -m "feat: add PublicHistoryView with marked + DOMPurify"
```

---

### Task 11: Write tests for settings service + markdown sanitization

**Files:**
- Create: `test/services/settingsService.test.ts`

- [ ] **Step 1: Check if settings service tests already exist**

Run: `rtk ls test/services/`

- [ ] **Step 2: Create `test/services/settingsService.test.ts`**

```ts
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { LandingPageSettings, DEFAULT_LANDING_SETTINGS } from '../../src/services/settingsService';

describe('LandingPageSettings', () => {
  describe('DEFAULT_LANDING_SETTINGS', () => {
    it('has all required fields with default values', () => {
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.heroHeadline, 'Welcome to Our Choir');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.heroSubtitle, 'Voices united in harmony.');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.aboutUsText, '');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.historyText, '');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.contactEmail, '');
    });

    it('has the correct keys', () => {
      const keys = Object.keys(DEFAULT_LANDING_SETTINGS).sort();
      assert.deepStrictEqual(keys, [
        'aboutUsText',
        'contactEmail',
        'heroHeadline',
        'heroSubtitle',
        'historyText',
      ]);
    });
  });

  describe('type safety', () => {
    it('allows valid LandingPageSettings', () => {
      const valid: LandingPageSettings = {
        heroHeadline: 'Test',
        heroSubtitle: 'Test',
        aboutUsText: '# About',
        historyText: '# History',
        contactEmail: 'test@example.com',
      };
      assert.strictEqual(valid.contactEmail, 'test@example.com');
    });
  });
});

describe('markdown sanitization with marked + DOMPurify', () => {
  let marked: { parse: (text: string, opts?: { async?: boolean }) => string | Promise<string> };
  let DOMPurify: { sanitize: (html: string) => string };

  before(async () => {
    const markedMod = await import('marked');
    const dompurifyMod = await import('dompurify');
    marked = markedMod.marked;
    DOMPurify = dompurifyMod.default;
  });

  it('renders bold markdown safely', () => {
    const html = marked.parse('**bold text**', { async: false }) as string;
    const result = DOMPurify.sanitize(html);
    assert.ok(result.includes('<strong>bold text</strong>') || result.includes('<b>bold text</b>'));
  });

  it('renders italic markdown safely', () => {
    const html = marked.parse('*italic text*', { async: false }) as string;
    const result = DOMPurify.sanitize(html);
    assert.ok(result.includes('<em>italic text</em>') || result.includes('<i>italic text</i>'));
  });

  it('renders links safely', () => {
    const html = marked.parse('[Click here](https://example.com)', { async: false }) as string;
    const result = DOMPurify.sanitize(html);
    assert.ok(result.includes('href="https://example.com"'));
  });

  it('strips script tags from input', () => {
    const html = marked.parse('<script>alert("xss")</script>', { async: false }) as string;
    const result = DOMPurify.sanitize(html);
    assert.strictEqual(result.includes('<script>'), false);
  });

  it('renders headings', () => {
    const html = marked.parse('# Hello World', { async: false }) as string;
    const result = DOMPurify.sanitize(html);
    assert.ok(result.includes('Hello World'));
  });

  it('handles empty string', () => {
    const html = marked.parse('', { async: false }) as string;
    const result = DOMPurify.sanitize(html);
    assert.strictEqual(typeof result, 'string');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `rtk npx vitest run test/services/settingsService.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add test/services/settingsService.test.ts
git commit -m "test: add LandingPageSettings and markdown sanitization tests"
```

---

### Task 12: Write tests for routing

**Files:**
- Create: `test/routing/publicLandingRoutes.test.tsx`

- [ ] **Step 1: Check for existing routing tests directory**

Run: `rtk ls test/routing/`

- [ ] **Step 2: Create `test/routing/publicLandingRoutes.test.tsx`**

```ts
// @vitest-environment jsdom
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('Public route recognition', () => {
  let isPublicRoute: (path: string) => boolean;

  before(async () => {
    const mod = await import('../../src/lib/authRedirect');
    isPublicRoute = mod.isPublicRoute;
  });

  it('recognizes / as a public route', () => {
    assert.strictEqual(isPublicRoute('/'), true);
  });

  it('recognizes /history as a public route', () => {
    assert.strictEqual(isPublicRoute('/history'), true);
  });

  it('recognizes /login as a public route', () => {
    assert.strictEqual(isPublicRoute('/login'), true);
  });

  it('recognizes /dashboard as NOT a public route', () => {
    assert.strictEqual(isPublicRoute('/dashboard'), false);
  });

  it('recognizes /admin/roster as NOT a public route', () => {
    assert.strictEqual(isPublicRoute('/admin/roster'), false);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `rtk npx vitest run test/routing/publicLandingRoutes.test.tsx`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add test/routing/publicLandingRoutes.test.tsx
git commit -m "test: add public route recognition tests"
```

---

### Task 13: Write tests for public views

**Files:**
- Create: `test/views/PublicLandingView.test.tsx`

- [ ] **Step 1: Create `test/views/PublicLandingView.test.tsx`**

```ts
// @vitest-environment jsdom
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

describe('PublicLandingView', () => {
  let PublicLandingView: React.ComponentType;

  beforeEach(() => {
    mock.method(global.Storage.prototype, 'getItem', () => null);
    mock.method(global.Storage.prototype, 'setItem', () => {});
  });

  afterEach(() => {
    mock.reset();
  });

  before(async () => {
    const mod = await import('../../src/views/PublicLandingView');
    PublicLandingView = mod.default;
  });

  it('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <PublicLandingView />
      </MemoryRouter>
    );
    const spinners = document.querySelectorAll('.animate-spin');
    assert.ok(spinners.length > 0);
  });

  it('renders navigation links', async () => {
    render(
      <MemoryRouter>
        <PublicLandingView />
      </MemoryRouter>
    );

    await waitFor(() => {
      const links = document.querySelectorAll('a');
      const hrefs = Array.from(links).map(a => a.getAttribute('href'));
      assert.ok(hrefs.some(h => h === '/tickets'));
      assert.ok(hrefs.some(h => h === '/donate'));
      assert.ok(hrefs.some(h => h === '/history'));
      assert.ok(hrefs.some(h => h === '/auditions'));
    }, { timeout: 5000 });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `rtk npx vitest run test/views/PublicLandingView.test.tsx`
Note: May require service mocking if services throw outside of React components.

- [ ] **Step 3: Commit**

```bash
git add test/views/PublicLandingView.test.tsx
git commit -m "test: add PublicLandingView smoke tests"
```

---

### Task 14: Final verification

- [ ] **Step 1: Run TypeScript compilation**

```bash
rtk npx tsc --noEmit
```
Expected: PASS (no errors)

- [ ] **Step 2: Run full test suite**

```bash
rtk npm test
```
Expected: All existing tests still pass. New tests pass.

- [ ] **Step 3: Run codebase integrity test**

```bash
rtk npx vitest run test/codebaseIntegrity.test.ts
```
Expected: PASS (DOMPurify.sanitize recognized as a valid guard)

- [ ] **Step 4: Verify no unsafe TypeScript patterns**

```bash
rtk rg '\bas any\b' src/views/PublicLandingView.tsx src/views/PublicHistoryView.tsx src/components/admin/LandingPageSettingsPanel.tsx
```
Expected: No results

- [ ] **Step 5: Run npm audit for new deps**

```bash
rtk npm audit --audit-level=high
```
Expected: No high-severity vulnerabilities

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: final verification, all checks pass"
```

---

## Self-Review

**1. Spec coverage:** All requirements mapped to tasks:
- Public homepage at `/` with hero, about, past performances, contact, links, login — **Task 9**
- Public `/history` page with admin-editable rich text — **Task 10**
- Move authenticated app to `/dashboard` — **Task 2**
- Group landing page text fields into single JSON — **Task 5** (stored under key `landingSettings`)
- Sanitize markdown output — **Tasks 9, 10, 11** (marked + DOMPurify pipeline)
- Fetch past performances with restricted fields — **Task 6** (client-side query, events already public-read)
- Update public route whitelist — **Task 1**
- Update catch-all redirect — **Task 2** (FallbackRoute component)
- Update backTo props — **Task 3**
- Admin settings UI with EasyMDE — **Task 7** (LandingPageSettingsPanel)
- Hero image upload — **Task 5** (saveHeroImage/getHeroImageUrl), **Task 7** (file input)
- Integration into SettingsView — **Task 8**

**2. Placeholder scan:** No "TBD", "TODO", or "implement later". All code steps have actual code blocks. All test steps have actual test code.

**3. Type consistency:**
- `LandingPageSettings` defined in Task 5, used consistently in Tasks 7, 9, 10, 11.
- `saveHeroImage`/`getHeroImageUrl` defined in Task 5, used in Tasks 7, 9.
- `getPastPerformances` defined in Task 6, used in Task 9.
- `marked.parse()` + `DOMPurify.sanitize()` used consistently across Tasks 9, 10, 11.

**4. Security note:**
The `events` collection has `listRule: ""` (public read), so a custom backend endpoint is unnecessary. The client-side `getPastPerformances` query restricts fields and limits results to 5. All rendered HTML is sanitized through `DOMPurify.sanitize(marked.parse(...))`.
