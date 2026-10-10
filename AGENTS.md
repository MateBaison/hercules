# Working in HERCULES

HERCULES is a fitness application migrated from a hosted HTML app to a server-rendered Next.js App Router application. It supports routines, workouts, exercise browsing, calendar history, progress, calculators, clocks and account management. Preserve compatibility with existing accounts and exercise history when changing behavior.

## Stack and commands

- Bun 1.4.2 is the package manager and unit-test runner; use `bun.lock` and `bun install --frozen-lockfile`.
- Next.js 16.3.8, React 19.2.8, strict TypeScript with `noUncheckedIndexedAccess`, and the `@/*` alias for `src/*`.
- Tailwind CSS 4, shadcn/ui with Base UI (`base-nova`), Lucide icons, Zod 4, Leaflet 1.9.4 and Supabase SSR/browser clients.
- Start locally with `bun run dev --hostname localhost --port 3000`. Node.js 20.9+ is required. Optional `.tools/` runtimes are machine-specific and ignored.
- Use `bun run typecheck`, `bun run test` (unit tests), `bun run build`, and `bun run baseline:verify` as appropriate for the change. There is no lint script.
- `bun run format` formats all source, scripts, tests and the Next.js/Playwright configs; prefer formatting only changed files for small changes.

## Source layout

- `src/app/`: route pages, layouts, loading/error boundaries, authentication callbacks and the account summary API. The `(application)` route group protects `/home`, `/library`, `/workout`, `/tools`, `/progress` and `/profile` and requires completed onboarding.
- `src/features/`: feature UI and browser interactions. Keep route pages thin and put reusable fitness behavior in the domain layer.
- `src/domain/`: pure calculations and workout/routine/progress behavior; `schemas/` defines persisted data and command validation, and `legacy/read-snapshot.ts` reads compatible snapshots.
- `src/data/`: validated exercise catalog and translation helpers. `src/data/legacy/` contains captured catalog/default data, not live user records. Add new exercise definitions/variants in `additional-exercises.json` and `additional-image-variants.json`; preserve the original 136 definitions and baseline assets.
- `src/components/ui/`: shared shadcn/Base UI primitives; `src/components/layout/`: account shell, header and navigation. Reuse these components and tokens/styles in `src/app/globals.css`.
- `src/state/app-provider.tsx`: account context exposed through `useApp()`, backed by `SyncController`. `runtime-provider.tsx` owns transient rest timers and the session clipboard; clocks also have a feature-specific provider.
- `src/lib/supabase/`: clients, verified authentication, account reads, snapshot repository and synchronization. `src/lib/storage/` owns per-account caches/backups; `src/lib/browser/` contains browser media helpers.
- `src/proxy.ts`: session cookie refresh and private/no-store response headers for matched account/auth routes.
- `tests/unit/`: Bun domain, compatibility, catalog and sync tests. `tests/browser/`: Playwright account and feature workflows. `scripts/`: mock backend, test builds and baseline tools.

## Account and persistence rules

- Verify users on the server for protected pages, API routes and actions. Preserve origin checks, safe redirect destinations and Supabase cookie handling. Cookie refresh in the proxy does not replace route-level authorization.
- Use only the public values in `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL`. Never add service-role keys or provider secrets to client configuration. The configured site origin must match local authentication requests; rebuild after changing public environment values.
- Cloud snapshots live in `public.mrgymson_state` (`user_id`, `payload`, `updated_at`). Keep repository ownership checks and account-scoped providers/caches. Local cache keys remain `mrgymson-user-<UUID>`; do not automatically upload legacy guest data into an account.
- Make persisted UI edits through `useApp().change(...)`, and use the existing flush/retry/status APIs. Do not create a second upload path or mutate the context snapshot directly.
- Preserve immediate local persistence, serialized 900ms-debounced uploads, edits made during uploads, and cancellation on account disposal. Complete initial cloud reading/reconciliation before uploads; failed reads must block cloud writes until recovery.
- Divergent local/cloud copies require an explicit choice and successful backups before replacement. Malformed snapshots must produce an error, not silently become an empty account. Distinguish local saves from confirmed cloud saves in the UI.
- Keep full photo-heavy snapshots on the browser-to-Supabase path; server account summaries select small profile fields. Browser writes use `updated_at` conditional updates (or insert for a missing row); stale writes must reconcile and preserve conflict backups before an explicit choice. Clean accounts refresh on focus and every 30 seconds while visible. There is no realtime merging; older clients with unconditional upserts must refresh.

## Compatibility and UI conventions

- GPS routes use optional `trackingSessions` with seconds, meters and private coordinates, separate from strength-training sessions measured in minutes. Finalization saves through the normal account change/sync path. Unfinished routes remain transient. Leaflet must load only in the browser; keep tile attribution, normal caching and listener/map cleanup. Do not add offline OpenStreetMap tile prefetch or claim reliable background GPS without native-device verification.

- Persisted readers are tolerant and preserve unknown fields; new command inputs are bounded/strict. Preserve historical nulls, string profile measurements, aggregate sessions without sets, retired exercise references, notes/photos and original `done`/`entered` flags.
- Repetitions and seconds are distinct metrics. Input autosave must work without a completion tick; untouched default values must not become recorded completed sets.
- Reuse the translation helpers and `useApp().t(spanish, english)`. Spanish is the default, English is the fallback, and Arabic requires RTL layout. The current language list is in `src/data/translations.ts`.
- Reuse `src/domain/menstrual-calendar.ts` for menstrual eligibility. Masculine profiles must hide menstrual controls, training-calendar borders/legend and readiness prompts even when a saved enabled flag exists; preserve recorded dates and settings.
- Preserve keyboard-accessible controls, dialog semantics, status announcements and mobile/desktop behavior. Browser APIs belong in client components or browser helpers, with effect/listener cleanup.
- Preserve original exercise IDs, image variants and optimized assets. `migration-baseline/manifest.json` verifies archived files and assets by SHA-256; do not regenerate the baseline merely to make a regression pass.
- Routine sharing and workout posters must omit private profile fields, body weights, photos and exercise notes. Full account exports contain private records.

## Verification workflow

For code changes, run relevant unit tests and typecheck; add regression coverage for changed domain, compatibility or sync behavior. Run a production build for changes affecting routes, server/client boundaries or configuration. Run baseline verification when changing catalog/assets or migration compatibility.

For browser workflows:

```sh
bun run test:build
bun run test:browser
```

Playwright uses a separate optimized `.next-test` build (`HERCULES_TEST_BUILD=1`), a loopback mock Supabase on port 54329 and the app on port 3010. It runs mobile and desktop viewports with one worker. Rebuild the test build after application changes. Use `bun x playwright install chromium` if needed, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium executable. Reports and traces are ignored under `artifacts/` and `test-results/`.

Use the mock backend for automated auth/database checks; keep test-only auth behavior out of application routes. Report checks actually run and any checks left unverified.

## Reference documents

Read `docs/data-compatibility.md` before modifying persistence or imports, `docs/deployment-and-rollback.md` for deployment/origin handoff, and `docs/phase-status.md` for release gates. `docs/approved-migration-plan.md` is the archived migration plan. The archived SQL is a reference, not proof of current hosted RLS. A local change or passing mock tests does not establish production deployment or real-provider validation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
