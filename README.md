# HERCULES — Next.js migration

The application journeys are implemented locally in Next.js, TypeScript, shadcn/ui, Zod and Bun. This is a full server-rendered Next.js application prepared for Vercel, not an HTML wrapper or static export. The existing hosted app and Supabase schema have not been changed.

## Included

- Email-code and Google PKCE sign-in, verified server authorization, profile onboarding and cookie refresh.
- Per-account local caches and Supabase synchronization, serialized 900ms-debounced uploads, offline recovery and explicit cloud/local reconciliation.
- Routine/day editing, automatic or custom routines, multi-select exercise picker, favorites, press-and-drag/keyboard reordering, supersets and routine sharing.
- Workout list/individual views, input autosave without ticks, previous weight + quantity copying, reps or seconds, notes, rest timer, images/instructions and finish/cancel.
- Calendar colors/dots, multiple expandable sessions per date, manual entry, edit/delete/copy/paste, photos, comments and body weights.
- All 136 original exercises, eight groups, equipment/search filters, custom exercises and original image variants.
- Profile/settings/export/import, nine language choices with the preserved translation/fallback catalog.
- Stopwatch, timer, combat preparation/presets/audio, running/cycling GPS route display, four calculators and exercise/weekly/muscle-group progress.
- Original HERCULES branding and downloadable/native-share workout posters.

Instagram/Snapchat fields are profile references, not official account linking or guaranteed story publication. GPS is foreground browser tracking, not a background-native tracker. No pending menstrual-cycle feature was added.

## Start the Desktop project

Use Bun 1.4.2 and Node.js 20.9+ (checked here with Node 24.19.0). On this Mac, optional project-local runtimes are included:

```sh
cd /Users/mb/Desktop/HERCULES-Nextjs-migration
export PATH="$PWD/.tools:$PATH"
bun install --frozen-lockfile
bun run dev --hostname localhost --port 3000
```

Open **http://localhost:3000**. The ignored `.env.local` contains the existing public Supabase URL/publishable key and this exact local origin. Use localhost, not 127.0.0.1, for this configuration: authentication actions verify the origin. Local Google access additionally needs the exact callback URL allowed in Supabase; see the deployment guide. No service-role key or Google secret belongs in this project.

On another machine, install Bun and Node normally; `.tools` is Mac-specific and excluded from deployment. Copy `.env.example` to `.env.local` and configure public values. Changing public environment variables requires a fresh build.

## Verification

```sh
bun run typecheck
bun test
bun run baseline:verify
bun run build
bun run test:build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" bun run test:browser
```

If you do not have Brave, install Chromium with `bun x playwright install chromium`, then omit the executable variable.

The browser checks use a separate optimized `.next-test` build and loopback-only mock Supabase on ports 3010/54329, with mobile and desktop viewports. They do not send real emails, use real Google consent, or write to the hosted database. GPS positions are browser-local simulations. No mock route or auth bypass is included in the application. Reports/screenshots live in ignored `artifacts/`.

See [phase status](docs/phase-status.md) for checked scope and remaining release gates.

## Organization

- `src/app`: routes, protected layouts, callbacks and server boundaries.
- `src/features`: independent authentication, library, routines, workouts, calendar, tools, progress and profile UI.
- `src/components/ui`: shadcn/ui primitives and dialog wrapper.
- `src/domain`: compatible Zod schemas and pure behavior.
- `src/lib/supabase`: browser/server clients, verified auth, repository and sync controller.
- `src/state`: account provider and account-scoped runtime clocks/clipboard.
- `src/data/legacy`: offline catalog/defaults/translations; not real user records.
- `public/assets`: unchanged optimized original images.
- `migration-baseline`: recoverable original HTML/SQL and 187 checksums, excluded from deployment.

## Release remains a separate step

No Vercel deployment or production cutover was performed. Configure the chosen Vercel origin, allow its callback in Supabase, and validate real email/Google/RLS/cross-device behavior before replacing the old frontend. Existing cloud data uses the same table and account IDs; unsynced data on the old origin must be explicitly exported/imported. Simultaneous devices retain the existing full-snapshot last-write-wins limitation.

[Deployment and rollback](docs/deployment-and-rollback.md) · [Data compatibility](docs/data-compatibility.md) · [Archived approved plan](docs/approved-migration-plan.md)
