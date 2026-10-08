# Phase status and verification

October 6, 2026. Local implementation covers phases 0–5. Phase 6 is prepared for Vercel, but deployment, real-account integration validation and authorized cutover remain open. The archived approved plan retains its original test-deferral wording; the later request to check continuity between phases enabled the checks below.

| Phase | Current implementation | Checked scope |
| --- | --- | --- |
| 0 — Baseline | Original HTML, SQL reference, optimized images, catalog/defaults/translations and generator pools preserved | 187 SHA-256 files; original source hashes unchanged |
| 1 — Foundation | Next.js App Router, Bun, strict TypeScript, shadcn, responsive branding/routes/boundaries | Type checks, optimized builds and responsive browser routes |
| 2 — Domain/adapters | Zod contracts, unknown-field preservation, cache backups, calculator math, automatic generator | All 1,785 generator combinations match the original; nullable legacy sessions/metrics/history preserved |
| 3 — Auth/sync | OTP, Google PKCE, protected verified-user server layouts, cookie refresh, repository and single account-scoped sync controller | Local mock-backed auth/onboarding/restore/sign-out, account switching, second browser context, offline/recovery/serialized upload tests |
| 4 — Main journeys | Library/picker, routines/days/goals/supersets/sharing, workout autosave/rest/images/notes, calendar/edit/copy, profile/preferences/export/import | Mobile/desktop journeys, multi-select/favorites, keyboard and press-and-drag ordering, workout/calendar round trips, PNG export |
| 5 — Tools/progress | Stopwatch/timer/combat/GPS, four calculators, comparable exercise evolution, frequency and muscle distribution | Combat phase/signal/deadline math, local GPS simulation, clocks across navigation, colored calculator outcomes, table/radar/chart rendering |
| 6 — Release | Real public env configured locally; full Next.js Vercel preset, Bun lockfile, setup/cutover/rollback instructions | Regular production build passes; publication and real external integration checks not performed |

## Final deliverable

`/Users/mb/Desktop/HERCULES-Nextjs-migration` contains the current source, original assets, Bun lockfile, local runtimes and documentation. The live frontend/Supabase schema was not changed. No legacy HTML script executes inside the Next.js application.

Strict types, 36 unit tests (7,457 assertions), 187 baseline checksums and the regular production build pass from this folder. The final combined 28-check browser gate passed at 390×844 and 1280×900, including custom goals, automatic routines and independent shared-routine imports. Read-only HTTP smoke checks on the regular production build returned 200 for the welcome page, a 200 streamed response for the library route and 401/private-no-store for the account summary. Next.js can embed an authentication redirect in an already-streamed 200 response; the transport status alone is not an auth-gate test. No real account was signed into or written by these checks.

The browser server uses a separate optimized `.next-test` build and an isolated loopback mock service, never the real Supabase database. The regular `.next` build uses the existing public project settings and contains no local mock endpoint/key. Screenshots and PNG posters are in ignored `artifacts/`.

A fresh browser also checked the regular production build: opening `/library` without a session followed the streamed redirect to `/login` and displayed the email form. No code was requested. All owned verification and production-preview servers were stopped after checks; the README explains how to launch the local app.

## Coverage and remaining release checks

- Login rejection, OTP verification, new-profile gate, Google PKCE wiring, cookie restoration, server auth, private/no-store summaries and account cache separation are checked with mocks.
- Workouts save edited inputs without ticks; previous values copy both load and quantity. Untouched blanks are not counted as completed sets. Timed sets remain distinct from repetitions.
- Current catalog/image files and original variants are unchanged. Dialog imagery fits the viewport; Escape/arrows work. Reordering is checked with a delayed pointer drag and keyboard coordinates, not a physical touchscreen.
- Calendar sessions preserve edited sets/notes/comments/colors; copies get independent IDs. Workout-poster fallback produces a valid 1080×1920 PNG and was visually inspected.
- GPS route/preparation is checked with browser-local position callbacks. Brave rejected its native geolocation override, so no real permission/device route success is claimed. Real phone GPS, background constraints, audible output and OS share menus remain manual checks.
- Original language choices/dictionary/fallbacks are retained; this is not a newly completed translation of every exercise or UI string.
- Real email delivery, Google consent, hosted RLS, real cross-device writes and Vercel callback configuration are not inferred from mocks or a green build.
- Simultaneous devices still use full-snapshot last-write-wins. The controller detects divergent copies at recovery but is not realtime merging or optimistic-concurrency control.
- Instagram/Snapchat are honest profile references/share-menu targets, not official OAuth connections or guaranteed story uploads.
- The original hosted URL is not assumed transferable to Vercel. New-origin cached-only data requires explicit private export/import.

## Preserved legacy baseline findings

Selected original browser journeys passed on mobile/desktop: automatic/custom routines, day edits, equipment filtering/non-floating library controls; profile drafts/photos/save failure; workout lists/autosave/prior values/time/notes/rest/supersets/finish/combat audio; image variants and calculator results.

Older harness failures were not hidden: `test_mrgymson.js` omits a later audio script; `test_auth_mrgymson.js` has a DOM stub without `.after()`; `test_onboarding_mrgymson.js` has stale welcome expectations; `test_calendar_autosave_browser.js` assumes a single input instead of the current list. These are not recorded as passes. New real-browser tests cover the migrated journeys separately.

See [deployment and rollback](deployment-and-rollback.md) for the external release gate.

## Follow-up: October 8, 2026

The current browser repository uses revision-conditional updates and duplicate-insert detection, with explicit backed-up conflict resolution. Clean accounts refresh on focus and at a 30-second visible-page interval. These supersede the migration-era last-write-wins statement above for updated clients; real multi-device provider validation remains a separate manual gate.

New UI messages have a separate translation overlay for all seven additional languages, preserving archived dictionaries. The weekly progress summary counts sessions, trained days and known duration per local day. New workout completions record elapsed minutes, including rests. Unknown durations are not invented. Menstrual controls are hidden for masculine profiles while stored dates are preserved.

Hosted authentication was inspected: public signups and email confirmation are enabled, Google is enabled, Apple is disabled, and custom SMTP is not configured. The user deferred SMTP setup. Apple web login remains blocked by the absence of an Apple Developer membership/eligible exemption. No provider secrets or paid services were created.

Verification for this follow-up: 50 unit tests (7,536 assertions), strict typecheck, the optimized webpack test build and 187 baseline checksums passed. The full 52-case browser run passed 46 cases; six old auth assertions were then updated for the current email field/sign-out label and revision-based PATCH uploads and passed on rerun. The final targeted run passed 16 cases across mobile and desktop, including 320px English/French/Arabic layouts, workout autosave, stored menstrual dates under gender changes, account isolation, sign-out failure handling, draft preservation and explicit conflict resolution. Native focus was simulated in the headless multi-context test because Chromium does not reliably emit it there. No real account data was changed during testing.
