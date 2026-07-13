# Communications UI/UX Polish Design

**Date:** 2026-07-13  
**Status:** Approved  
**Area:** Admin Communications  
**Primary constraint:** Approximately half of usage occurs on mobile devices.

## Context

The Communications experience is functionally capable, but its current presentation makes routine
work harder than necessary, especially on phones. The main issues are duplicated wizard actions,
sticky controls that cover content, clipped section navigation, preserved scroll position between
wizard steps, a tall audience summary, dense template selection, a long settings page, weak draft
continuity, and a history status that says `Sent` before the per-recipient queue has necessarily
finished.

The composer has already been refactored into step components under
`src/views/admin/communications/`. This design preserves that architecture. It improves complete
workflows in three independently releasable phases and introduces shared components only when more
than one screen needs the same behavior.

## Goals

- Make composing and sending a message comfortable at a 390 px phone width.
- Reduce accidental sends and make recipient exclusions visible before confirmation.
- Give keyboard and assistive-technology users semantic controls and predictable focus.
- Protect in-progress work through quiet, reliable autosave.
- Make settings easier to understand and save safely.
- Report queue progress honestly and allow bounded retries of failed deliveries.
- Preserve existing message, token, template, and queue compatibility contracts.

## Non-goals

- Building a separate mobile-only communications application.
- Redesigning the message editor or changing message content formats.
- Changing signed-token payloads, separators, signatures, or parsers.
- Claiming inbox delivery without provider delivery-receipt webhooks.
- Replacing the existing email queue or maintenance runner.
- Modifying historical migrations.

## Release strategy

The work will ship as workflow-oriented vertical slices:

1. **Phase 1 — Mobile sending flow and accessibility**
2. **Phase 2 — Draft confidence and settings organization**
3. **Phase 3 — Delivery visibility and retry**

Each phase must be independently testable and safe to release. Phase 1 and Phase 2 should require no
schema changes. Phase 3 is designed around existing `emailQueue` fields and should also avoid a
schema change; if implementation discovery proves otherwise, it must use a new forward migration.

## Phase 1 — Mobile sending flow and accessibility

### Communications section navigation

Desktop retains the existing tab row. Below the mobile breakpoint, the clipped horizontal rail is
replaced by one full-width, visibly labeled section selector containing:

- Compose
- Drafts
- History
- Templates
- Upcoming Sends
- Settings

The selector uses the existing `Select` wrapper and changes the same `CommunicationTab` state as the
desktop tabs. `Scheduled` becomes `Upcoming Sends`, and creation actions use `+ New Message`.

### Wizard structure and movement

The existing Audience, Template, Compose, and Review steps remain. Each step renders exactly one
action bar. The bar is sticky above the device safe area on phones and static at the end of the step
content on desktop. Step content reserves enough bottom space that the sticky bar cannot cover the
last input or validation message.

Mobile action labels are short enough to fit in one 44 px-high row, while accessible names retain
the full action meaning. The stepper targets are at least 44 by 44 px. Its current-step state is
exposed semantically and announced without making decorative progress lines or check marks noisy.

`ComposePanel` owns step-transition behavior. After a valid step change, it scrolls the wizard
container to its beginning and moves focus to the new step heading. Headings use `tabIndex={-1}` so
focus does not add an extra tab stop. Scrolling respects the user's reduced-motion preference.

### Audience step

On mobile, the current stacked statistic cards become one compact Total / Email / SMS summary strip.
There is one clear `Review recipients` action. The summary shows both reachable and excluded counts
for the selected channel rather than hiding exclusions in recipient details.

Desktop can retain the more spacious card presentation. Any interactive statistic uses a semantic
button rather than a clickable `div`.

### Template step

Template selection is ordered as:

1. Blank message
2. Recommended system templates
3. Recently updated custom templates
4. Collapsed access to the remaining templates

Templates use buttons or radio-style controls with selection state. Selecting a template previews
it but does not navigate. An explicit `Use template` action applies it and advances to Compose.
Phones use a compact single-column list and show the selected template details near the selected
item. Desktop may use the existing wider grid treatment.

### Compose step

The duplicated top action group is removed. The single action bar contains Back, Save Draft, and
Review actions during Phase 1. Manual draft saving remains until Phase 2 autosave is released.

The existing channel, subject, editor, placeholder, set-list warning, preview, and validation
components remain responsible for their current domain behavior. This phase changes their layout
and interaction hierarchy, not message generation.

### Review and send safety

Mobile review order is:

1. Recipient summary
2. Message preview
3. Compliance and validation checks
4. Send actions

The phone preview defaults to Mobile while retaining the Desktop/Mobile switch. Desktop retains a
two-column preview and summary arrangement without duplicating send controls.

The final confirmation includes:

- the subject, or an SMS-message fallback when there is no subject;
- the selected channel;
- reachable people;
- email and SMS reach separately for `Both`; and
- recipients excluded because the selected channel is unavailable.

Confirmation and action copy use correct singular/plural wording. Buttons remain disabled while a
send is active, and the existing raw PocketBase error remains available to the shared formatter.

### Accessibility requirements

- Replace clickable template and audience `div` elements with semantic controls.
- Associate every visible field label with its control.
- Hide decorative icons and emoji from assistive technology.
- Give icon-only controls explicit accessible names.
- Maintain a minimum 44 by 44 px touch target for wizard and primary navigation controls.
- Preserve visible focus and logical keyboard order.
- Announce step and recipient-summary changes without repeatedly announcing decorative content.

### Phase 1 acceptance criteria

- A 390 by 844 viewport never clips the section selector or hides the final form field behind the
  action bar.
- Each wizard step has only one visible instance of each navigation/send action.
- Entering Review from a long Compose page lands at the recipient summary, not midway down Review.
- A keyboard user can select a template, review recipients, complete the wizard, and cancel the
  send confirmation.
- The confirmation states channel reach and exclusions accurately.

## Phase 2 — Draft confidence and settings organization

### Autosave activation and state

Autosave is enabled on all devices, with phone interruption and backgrounding as the primary design
case. It starts only when meaningful message content exists or an existing draft has been resumed.
Opening Compose or changing default audience filters alone does not create a blank draft.

The UI exposes these states:

- `idle`: no meaningful draft exists;
- `dirty`: the local snapshot differs from the last saved snapshot;
- `saving`: a save is in flight;
- `saved`: the latest snapshot is persisted;
- `error`: the latest snapshot could not be saved; and
- `conflict`: a newer server copy was detected after returning from the background.

After approximately 1.5 seconds without edits, the latest dirty snapshot is saved. Saves are
single-flight: rapid edits produce at most one active request and one latest queued snapshot. When
the active request finishes, the queued snapshot is saved if it still differs. An older response
must never replace newer local state.

The hydration path is gated so that resuming a draft does not autosave partially restored fields.
Pending work is flushed before wizard transitions where practical. Browser-leave warnings appear
only for dirty, saving, error, or conflict states.

### Save feedback and recovery

The Phase 1 Save Draft button becomes a compact status in the action area:

- `Saving…`
- `Saved just now`
- `Couldn't save — Retry`

When dirty, a `Save now` action is available. Autosave success does not generate a toast. Failure
stays visible and non-blocking, and Retry persists the latest snapshot. PocketBase errors are not
wrapped or replaced before display formatting.

When an existing draft is resumed, subsequent saves update that record. If the app returns from the
background and detects a server `updated` value newer than the locally known version, autosave
pauses. The user chooses `Reload latest` or `Save as copy`; local work is not silently overwritten.

### Draft management

The existing responsive `DataTable` remains. Mobile cards prioritize subject, channel, and last
updated time, followed by Resume and Delete actions. The empty state includes `+ New Message`.
Deletion uses a danger-styled confirmation with visible Cancel and Delete actions.

### Settings information architecture

Templates remain a top-level Communications section and are removed from `SettingsPanel`, which
currently renders the same template manager a second time. Settings becomes three stacked sections:

1. **General & Compliance** — mailing address, application URL, and default SMS country code.
2. **Delivery Provider** — SMTP/Brevo selection, provider guidance, and Brevo credentials.
3. **Connection Tests** — separately labeled email and phone inputs with independent test actions
   and results.

Phones use stacked cards rather than a second nested tab system. A sticky dirty-state bar provides
`Cancel changes` and `Save settings`. The complete staged payload is passed directly to the save
mutation; the implementation must not call a React state setter and then read the potentially stale
parent state inside the same event.

Credentials remain masked. Secrets never appear in UI errors, console logs, or test fixtures.
Success and failure remain visible after submission.

### Empty states and language

Drafts, History, Templates, and Upcoming Sends receive contextual empty states with a relevant call
to action. Search and filter controls are hidden when there is no underlying data to search. The
communications area consistently uses `+ New Message`, `Review recipients`, `Upcoming Sends`, and
the configured performer label.

### Phase 2 acceptance criteria

- Rapid editing cannot cause an older autosave response to overwrite newer work.
- Opening or hydrating a draft does not create a redundant write.
- A failed autosave remains recoverable without blocking editing.
- Returning to a draft with a newer server version cannot silently overwrite either copy.
- Settings save the values visible in the form, including on the first click.
- Templates appear in only one management location.

## Phase 3 — Delivery visibility and retry

### Delivery terminology and derived state

The queue proves application-to-provider dispatch, not inbox delivery. The UI uses `Sent`, not
`Delivered`, until provider delivery-receipt webhooks are implemented.

Delivery display state is derived from related `emailQueue` rows and kept separate from
`messages.status`:

| Display state | Derivation |
| --- | --- |
| Queued | Queue rows exist and all are Pending. |
| Sending | At least one row is Pending or Processing. |
| Sent | All queue rows are Sent. |
| Partial | No rows remain active, and both Sent and Failed rows exist. |
| Failed | All queue rows are Failed. |
| Archived | The message lifecycle status is Archived. |
| Tracking unavailable | A legacy Sent message has no related queue rows. |

`messages.status` continues to represent Draft/Sent/Failed/Archived lifecycle state. Queue progress
is not denormalized back into the message record.

### Delivery-summary endpoint

Add an authenticated admin-only endpoint under `pocketbase/pb_hooks_src/`:

`POST /api/admin/communications/delivery-summary`

The request accepts a bounded list of message IDs. The UI sends only the current history page
(currently at most ten); the endpoint rejects requests above its documented hard limit. It returns
per-message totals for Pending, Processing, Sent, and Failed, split into Email and SMS counts, plus
last activity and a bounded set of sanitized failures.

The response must not include provider credentials, raw tokens, full queue records, or unmasked
recipient destinations. Failure entries may include queue ID, recipient name, masked destination,
channel, attempts, and a sanitized category. The response indicates when additional failures were
omitted.

Server-side aggregation avoids one request per message and avoids transferring every queue row to
the browser. Dynamic values use parameterized queries or PocketBase filter helpers.

### History presentation and refresh

History replaces the unconditional Sent badge with the derived state and compact progress, for
example `48 of 50 sent · 2 failed`. `Both` messages expose separate Email and SMS totals. A status
filter sits beside the existing source filter.

The existing message-details experience gains a Delivery section with channel totals, last
activity, sanitized failures, and retry availability. Mobile history cards prioritize subject,
status/progress, date, and one Details action.

Delivery summaries poll every 15 seconds only while the History section is visible and at least one
visible message is Queued or Sending. Polling stops when all visible messages are terminal, restarts
on a qualifying page, and refreshes on window focus.

### Retry endpoint and behavior

Add a second authenticated admin-only endpoint:

`POST /api/admin/communications/retry-failed`

The request contains one message ID. The server selects only related queue rows currently marked
Failed, resets their attempt count and processing state, clears sanitized error state, and returns
the number moved back to Pending. Sent, Pending, and Processing rows are untouched. Calling the
endpoint again while those records are no longer Failed returns zero, making the operation
idempotent.

Retry does not recreate the message and never resends successful deliveries. The existing queue
processor performs the new bounded attempt cycle. The UI uses a danger-styled confirmation that
states how many failed deliveries will be retried and includes Cancel. After success, the summary is
invalidated and displays Queued or Sending.

### Phase 3 security and compatibility

- Both endpoints require an authenticated administrator.
- Provider failures are sanitized before leaving the server.
- Credentials, signed tokens, complete recipient contact details, and provider secrets are never
  logged.
- Existing queue debug statements that serialize `rawRecipients`, normalized phone numbers, or
  per-recipient destinations are removed; operational logging is limited to message IDs and
  aggregate channel counts.
- Signed-token construction and parsing are unchanged.
- Hook work is made only in `pocketbase/pb_hooks_src/`; `main.pb.js` is regenerated rather than
  edited.
- The endpoint and queue changes preserve the queue processor's existing three-attempt bound.

### Phase 3 acceptance criteria

- History distinguishes queued, active, successful, partial, failed, archived, and legacy messages.
- Status totals match related queue rows and channel types.
- History produces one bounded summary request per visible page, not one request per message.
- Polling stops for terminal pages and while History is not visible.
- Retry moves only failed rows to Pending and cannot resend successful rows.
- Raw provider errors and unmasked destinations never reach the browser.

## Testing strategy

### Component and hook tests

- Extend the existing communication step tests rather than replacing them.
- Assert one action set per step, focus movement, mobile ordering, semantic controls, exclusions, and
  send-confirmation content.
- Use the repository's `node:test` Vitest compatibility layer and explicit DOM cleanup.
- Use `mock.timers` for autosave debounce and polling; never wait for real time.
- Cover autosave hydration, coalescing, retry, conflict, and unload-warning behavior.
- Cover settings dirty detection, cancellation, direct-payload saving, masking, and empty-state
  navigation.
- Cover every delivery-state derivation and polling start/stop transition.

### PocketBase hook tests

- Test admin authorization and request limits for both endpoints.
- Test aggregation across Pending, Processing, Sent, and Failed queue rows and both channels.
- Test archived and legacy messages.
- Test sanitized failures, bounded output, retry idempotency, and successful-row preservation.
- Regenerate and verify the hook bundle after source changes.

### Manual responsive smoke test

Walk through the complete flow at 390 by 844, a tablet viewport, and desktop width. Verify the
section selector, sticky safe area, keyboard focus, browser back/forward behavior, draft background
and recovery behavior, settings save state, history progress, and retry confirmation.

## Risks and mitigations

- **Sticky controls can collide with mobile keyboards.** Keep one compact action row, reserve safe
  area, and test with real input focus at phone height.
- **Autosave can produce stale writes.** Use hydration gating, content fingerprints, and a
  single-flight latest-snapshot queue.
- **Cross-device drafts can conflict.** Compare server update time after backgrounding and require an
  explicit reload-or-copy choice.
- **Sent can be mistaken for delivered.** Use dispatch-accurate terminology and document that
  delivery receipts require future provider webhooks.
- **Large recipient lists can overload history.** Aggregate server-side, bound message IDs and
  failure details, and poll only active visible pages.
- **Manual retry can create duplicates.** Retry only Failed rows in place and make the transition
  idempotent.

## Documentation impact

The implementation plan should reference this design and the existing project domain rules. No
`CONTEXT.md` terminology changes are required because this work does not change domain definitions.
If Phase 3 later expands to provider delivery receipts, that work needs a separate design covering
webhook authenticity, bounce state, retention, and provider-specific compatibility.
