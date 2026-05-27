---
phase: 06
slug: engagement-polls
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-26
---

# Phase 06 — Validation Strategy

> Retroactive Nyquist validation contract reconstructed from phase execution artifacts.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (TypeScript via `--experimental-strip-types`) |
| **Config file** | `test/register.js` |
| **Quick run command** | `node --import ./test/register.js --experimental-strip-types --test test/pollService.test.ts test/phase06PollsValidation.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --import ./test/register.js --experimental-strip-types --test test/pollService.test.ts test/phase06PollsValidation.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | POLL-01 | T-06-01 / T-06-02 | Poll collections and unique response constraint are defined in migration | unit (source integrity) | `node --import ./test/register.js --experimental-strip-types --test test/phase06PollsValidation.test.ts` | ✅ | ✅ green |
| 06-01-02 | 01 | 1 | POLL-02 | T-06-01 / T-06-02 | Poll hooks require signed tokens and expose only expected endpoints | unit (source integrity) | `node --import ./test/register.js --experimental-strip-types --test test/phase06PollsValidation.test.ts` | ✅ | ✅ green |
| 06-02-01 | 02 | 2 | POLL-03 | — | Poll service wraps backend endpoints and communication poll links are tokenized/encoded | unit | `node --import ./test/register.js --experimental-strip-types --test test/pollService.test.ts test/phase06PollsValidation.test.ts` | ✅ | ✅ green |
| 06-02-02 | 02 | 2 | POLL-04 | — | Public `/poll` flow reads token and submits response via service | unit (source integrity) | `node --import ./test/register.js --experimental-strip-types --test test/phase06PollsValidation.test.ts` | ✅ | ✅ green |
| 06-03-01 | 03 | 3 | POLL-05 | — | Poll selection modal supports create/select poll actions | unit (source integrity) | `node --import ./test/register.js --experimental-strip-types --test test/phase06PollsValidation.test.ts` | ✅ | ✅ green |
| 06-03-02 | 03 | 3 | POLL-05 | — | Communication composer opens modal and inserts poll placeholder flow | unit (source integrity) | `node --import ./test/register.js --experimental-strip-types --test test/phase06PollsValidation.test.ts` | ✅ | ✅ green |
| 06-04-01 | 04 | 3 | POLL-06 | — | Admin dashboard includes archive filtering and volunteer/decliner drilldown | unit (source integrity) | `node --import ./test/register.js --experimental-strip-types --test test/phase06PollsValidation.test.ts` | ✅ | ✅ green |
| 06-04-02 | 04 | 3 | POLL-07 | — | Admin route `/admin/polls` is registered | unit (source integrity) | `node --import ./test/register.js --experimental-strip-types --test test/phase06PollsValidation.test.ts` | ✅ | ✅ green |
| 06-05-01 | 05 | 4 | POLL-07 | — | Logged-in poll service merges singer responses and upserts safely | unit | `node --import ./test/register.js --experimental-strip-types --test test/pollService.test.ts` | ✅ | ✅ green |
| 06-05-02 | 05 | 4 | POLL-07 | — | Singer dashboard renders Quick Polls and calls logged-in response path | unit (source integrity) | `node --import ./test/register.js --experimental-strip-types --test test/phase06PollsValidation.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-26
