# HERCULES — Next.js migration plan

Prepared: October 6, 2026

Status: planning only. No Next.js application has been scaffolded, no dependencies have been installed, and no production or Supabase settings have been changed.

Revision: full Next.js application on Vercel, as requested. No test creation, test dependency installation or test execution in the current migration scope. Build/type checks are compilation checks, not behavioral tests; this planning revision runs neither.

Destination: `/Users/mb/Desktop/HERCULES-Nextjs-migration`

## 1. Objective and non-negotiables

Replace the current single-file HTML/CSS/JavaScript application with a maintainable Next.js App Router application written in TypeScript, using shadcn/ui for matching interface components and Zod for runtime validation.

Preserve HERCULES's existing appearance, functionality, Supabase accounts and saved data. This is a migration, not a redesign or database rewrite.

- All authored application code and scripts use `.ts` or `.tsx`; use `next.config.ts`. JSON, CSS, SQL and documentation retain their appropriate formats. Generated JavaScript build output is expected and is not authored application source. Tests are deferred until requested.
- Enable TypeScript `strict`, `noUncheckedIndexedAccess` and `allowJs: false`. Do not bypass checks with blanket `any`, unchecked assertions or ignored build errors.
- Use Bun as the sole package manager for the new project, including dependency installation, CLI tools, scripts and the committed `bun.lock`. Do not mix npm, pnpm or Yarn lockfiles.
- Use the same Supabase project and existing `public.mrgymson_state` table. Keep existing user IDs and RLS protections.
- Keep Google sign-in, email-code registration/sign-in, session restoration, refresh, onboarding, cloud synchronization and sign-out.
- Keep all existing exercise IDs, routine/day IDs, history, custom exercises, favorites, preferences, in-progress workouts, notes, photos and units.
- Keep original images and their identity-based variant selection. Do not regenerate assets during the framework migration.
- Preserve HERCULES's logo, dark theme, orange accents, mobile-first layout and bottom navigation.
- Do not implement the pending menstrual-cycle idea. It remains explicitly outside scope.
- Do not replace the live application or deploy to Vercel during this planning task. Implementation and deployment require separate authorization. Preserve a rollback baseline, and explicitly describe behavioral verification as deferred while tests remain out of scope.

## 2. Current application inventory

The current source of truth is:

- `outputs/MrGymson_mobile.html`: approximately 347 KB of application HTML, CSS and inline JavaScript. The historical filename is not an indication of the displayed brand.
- `outputs/assets/`: portable source images, including the logo and exercise variants.
- `site-preview/dist/`: currently published HTML and optimized assets.
- `work/build_site.js`: current asset/build verification.
- `outputs/Configurar_Supabase_MrGymson.sql`: documented table and access-policy setup.
- `work/test_*.js`: existing behavioral regression checks and test fixtures.
- `work/IDEAS_PENDIENTES.md`: deferred feature requests.

The implementation repeatedly overrides view functions and relies on shared mutable state, DOM queries, inline event handlers and browser APIs. Extract behavior rather than wrapping the old HTML inside a React component or copying `innerHTML` rendering into the new project.

### Features that must survive

1. Welcome, email verification, Google access and personal-profile onboarding.
2. Routine creation, automatic generation, rename/delete, days, exercise selection, multi-selection, reordering and superseries.
3. In-progress workouts: list and individual layouts, folding, blank new sets, automatic input persistence, previous-result copying, repetitions versus seconds, notes, optional rest timer, image/technique dialogs and finish/cancel flow.
4. Calendar: training markers/colors, multiple workouts per date, folding, manual entry, editing/deletion, copy/paste, comments, photos and initial/final body weight.
5. Exercise library: muscle categories, search, equipment filters, favorites, custom exercises, keyboard navigation and image variants.
6. Tools: stopwatch, timer, combat presets/configuration/preparation/audio, running/cycling GPS tracking, calorie/macronutrient/1RM/weight-target calculators.
7. Progress: exercise evolution, comparable improvements, training frequency, muscle-group distribution and existing analytics.
8. Profile: compact photo inside personal details, conditional save button, collapsed social section, account synchronization and final sign-out action.
9. Settings: units and existing language behavior. Do not promise translations the current app does not provide.
10. Routine-sharing links and downloadable/native-share workout images.

Instagram/Snapchat profile fields are not official OAuth connections or guaranteed story publishing. Preserve this distinction; migration must not falsely label them as connected.

## 3. Recommended architecture decision

Use a full Next.js App Router application on Vercel's Next.js runtime, with Server Components, protected server layouts, Server Actions and request-dependent Route Handlers. Do not use static export. Vercel supports server-rendered Next.js pages and Route Handlers. [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)

Use `@supabase/ssr` with separate browser and request-scoped server clients. Authentication becomes cookie-based and available to both server and client code. Use the documented Proxy refresh integration appropriate to the selected Next.js release; do not authorize requests solely from unverified `getSession()` data. [Supabase SSR client documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)

Planned configuration:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Use the full Next.js runtime; no output: 'export'.
};

export default nextConfig;
```

Use the Node.js runtime for server auth/actions/handlers by default. Keep authenticated routes dynamic, request-scoped and private; do not cache personalized responses publicly or place user sessions in module-level server singletons. Server-render the app shell and a small account/profile summary; load full workout data through the dedicated synchronization adapter.

### Bun package management

Choose a compatible stable Bun version during implementation and record that exact version in `package.json`'s `packageManager` field. Commit the text-format `bun.lock`, use `bun install`/`bun add` for dependencies and `bunx` for scaffolding/shadcn CLI commands. Do not introduce competing lockfiles. [Bun lockfile documentation](https://bun.sh/docs/pm/lockfile)

Use `bun run dev`, `bun run build`, `bun run typecheck` and, when a local production server is requested, `bun run start`. Their package scripts invoke `next dev`, `next build`, `tsc --noEmit` and `next start`, respectively. Do not substitute Bun's standalone bundler (`bun build`) for the Next.js build, and do not add test scripts or test dependencies in this scope.

Vercel recognizes Bun from its lockfile. Configure installation as `bun install --frozen-lockfile` and the build as `bun run build`, retaining the Next.js framework preset and managed output. Bun is the package manager here, not a request to switch Vercel Functions to Bun's runtime; server code continues to use the default Node.js runtime. [Vercel package managers](https://vercel.com/docs/package-managers), [Bun installation options](https://bun.sh/docs/pm/cli/install)

Browser APIs such as storage, Web Audio, geolocation, canvas, sharing and drag interactions belong behind client boundaries and effects. Even Client Components may be prerendered, so avoid top-level access to `window` and `localStorage`.

Use Server Actions for email OTP, verification, sign-out and appropriate small form commands, with Zod input validation and authenticated authorization at every entry point. Use `auth/callback/route.ts` for Google's PKCE code exchange and Route Handlers for small account summaries or other actual HTTP interfaces. Do not move calculations, timer ticks, GPS collection or every keystroke to the server.

### Large existing payloads

Account snapshots can include base64-encoded profile/workout photos. Vercel Functions currently limit request and response bodies to 4.5 MB; Server Actions also have a default 1 MB request limit. Raising the Server Action setting does not remove the Vercel platform limit. [Vercel limits](https://vercel.com/docs/functions/limitations), [Next.js Server Action limits](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)

To preserve the existing database format, keep complete snapshot reads/upserts directly between the authenticated browser Supabase client and Supabase, inside a centralized typed repository with Zod validation and RLS. Do not proxy arbitrary snapshots through Vercel or serialize a full photo-heavy snapshot into Server Component props. Server readers request only small fields needed for authorization/onboarding/layout summaries.

This is still a full server-rendered Next.js application: server auth, protected layouts, cookie refresh, PKCE callbacks and small Server Actions are real runtime features. Direct large-data transfer is an explicit compatibility decision, not a static-export fallback. One synchronization controller owns full snapshot writes; server-side commands must not independently overwrite the same JSONB record with stale snapshots.

Moving photos to private Supabase Storage with ownership policies would be a separate data migration requiring approval; no bucket/schema changes are assumed here.

### New deployment origin

The Vercel URL is not yet selected. A new origin cannot read the old site's localStorage or cookies. Existing Supabase accounts and cloud data can be retained by signing in on the new deployment, but guest/offline-only data needs an explicit export/import or authorized handoff from the old origin. Do not promise automatic cross-domain cache/session transfer.

Keep the old site available as a recovery baseline until cutover is authorized. Publish new sharing links using the chosen Vercel origin; old links remain tied to the old site unless an explicit forwarding/handoff change is made there. Do not assume the existing `chatgpt.site` subdomain can be assigned to Vercel. Avoid prolonged use of old and new writers against the same full-snapshot record because the current last-write-wins limitation remains.

## 4. Proposed project organization

This is the future implementation structure, not files created by this planning task:

```text
HERCULES-Nextjs-migration/
├── README.md                       # this migration plan
├── package.json                    # created in implementation phase
├── bun.lock                        # sole dependency lockfile, committed
├── next.config.ts
├── tsconfig.json
├── components.json                 # shadcn configuration
├── .env.example                    # names/placeholders only
├── .gitignore
├── public/
│   ├── assets/                     # optimized published assets, paths retained
│   └── hercules.webmanifest
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # root compatibility and auth/share entry
│   │   ├── globals.css
│   │   ├── auth/callback/route.ts  # server-side Google PKCE exchange
│   │   ├── auth/legacy-session/route.ts # optional same-origin session bridge
│   │   ├── api/account/summary/route.ts # small authenticated response only
│   │   ├── login/page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── (application)/
│   │       ├── layout.tsx          # verified server auth and onboarding gate
│   │       ├── home/page.tsx
│   │       ├── library/page.tsx
│   │       ├── workout/page.tsx
│   │       ├── tools/page.tsx
│   │       ├── progress/page.tsx
│   │       └── profile/page.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn primitives in TypeScript
│   │   └── layout/                 # header, bottom nav, app shell, boundaries
│   ├── features/
│   │   ├── auth/                   # OTP, Google, onboarding, session provider
│   │   ├── routines/               # editors, generator, picker, sharing
│   │   ├── workouts/               # set entry, folds, supersets, rest, finish
│   │   ├── calendar/               # date cells, recorded-workout editor
│   │   ├── exercises/              # catalog, favorites, custom exercises
│   │   ├── clocks/                 # timer engines and audio controllers
│   │   ├── tracking/               # geolocation and route visualization
│   │   ├── calculators/            # pure typed calculations and forms
│   │   ├── progress/               # comparable metrics and charts
│   │   ├── profile/                # profile editor and photo handling
│   │   └── sharing/                # image rendering and browser share adapter
│   ├── domain/
│   │   ├── schemas/                # Zod data contracts and inferred types
│   │   ├── legacy/                 # versioned, non-destructive migration
│   │   └── calculations/           # pure domain functions
│   ├── data/                       # typed catalog, image registry, translations
│   ├── state/                      # typed reducer, providers and selectors
│   └── lib/
│       ├── supabase/
│       │   ├── browser.ts          # createBrowserClient
│       │   ├── server.ts           # request-scoped createServerClient
│       │   ├── refresh.ts          # request/response cookie refresh helper
│       │   ├── database.types.ts    # generated from actual database
│       │   ├── auth-actions.ts     # validated OTP / verify / sign-out actions
│       │   ├── account-reader.ts   # server-only, small profile/account fields
│       │   ├── state-repository.ts # full snapshots: browser -> Supabase + RLS
│       │   └── sync-controller.ts
│       ├── storage/                # per-user browser cache and legacy adapter
│       ├── browser/                # audio, photos, GPS, share capabilities
│       ├── env.ts                  # validated public configuration
│       └── utils.ts
│   └── proxy.ts                    # auth refresh integration for selected Next version
└── docs/
    ├── data-compatibility.md
    ├── deployment-and-rollback.md
    └── parity-checklist.md
```

Use feature modules for business behavior, shared components for presentation, and repository adapters for persistence. UI components must not issue arbitrary Supabase fetches or own synchronization logic. Begin with React Context plus a typed reducer; add a state library only if implementation demonstrates a concrete need. The future project currently has no test directory or test dependencies: these are deferred by request.

## 5. shadcn/ui component mapping

Install official shadcn/ui components and style them with the existing HERCULES tokens rather than adopting a generic dashboard appearance. Keep their accessible focus, keyboard and dialog behavior. [Official Next.js setup](https://ui.shadcn.com/docs/installation/next)

| Existing surface | Planned components |
| --- | --- |
| Buttons, forms and inputs | Button, Input, Label/Field, Textarea, Select |
| Welcome/email verification | Card, Input OTP, Alert, form validation |
| Country and exercise search | Combobox/Command with Popover |
| Routine days and workout exercises | Accordion with multiple open items, Collapsible |
| Exercise details and enlarged technique image | Dialog/Sheet with contained image |
| Mobile selectors and finish flow | Sheet/Drawer as appropriate |
| Delete/cancel confirmation | Alert Dialog |
| Calendar cells | Calendar customized for multiple workout colors/dots |
| Muscle/equipment categories | Tabs, Dropdown Menu, Toggle Group |
| Profile and account | Card, Avatar, Collapsible, Select |
| Optional timers and audio | Switch, Input, Button |
| Toasts and save/sync feedback | Sonner, Badge, Alert, Skeleton |
| Progress | Chart and Table around existing metric calculations |

Supersets, colored calendar markers, workout-set grids, the logo and bottom navigation are application compositions, not custom replacements for accessible primitives. Retain a suitable touch-friendly sortable interaction for exercise ordering; convert existing behavior to TypeScript or use a reviewed sortable library if needed.

## 6. TypeScript and Zod contracts

Create schemas first and infer domain types with `z.infer`, so runtime validation and compile-time types share one contract. Use `safeParse` at trust boundaries. [Zod basic usage](https://zod.dev/basics)

Validate:

- Public environment values, with only the public Supabase URL and publishable key exposed to the browser.
- Profile and onboarding inputs; optional fields remain optional, using the current internal gender values rather than relabeling persisted data.
- Routine/day/exercise structures and custom exercise definitions.
- Repetition versus timed sets: discriminate the metric, preserve `null` for unentered values, and never convert old repetitions into seconds.
- Superset references, duplicate memberships and exercise reordering.
- Shared routine payloads, length limits, supported version, exercise IDs and custom-exercise remapping.
- Browser-cache contents and the database `payload`, treated as `unknown` until parsed.
- Calculator inputs, clock configurations, photo metadata and tracking points.

Persisted legacy objects need a tolerant compatibility reader that preserves unknown fields; form and shared-link inputs should be stricter. Do not silently delete retired exercise history, old profile/social fields or unrecognized future metadata. Invalid saved data must not trigger replacement with an empty default state or an automatic cloud write.

Keep legacy `done`/`entered` semantics readable for historical records while ensuring the new UI remains tick-free and saves typed values automatically. Migrations are pure, versioned and repeatable. Back up raw local payloads before conversion and retain recoverable originals.

Generate `Database` TypeScript types from the actual Supabase schema once authorized CLI/project access is available. JSONB's database type is not a substitute for the Zod domain payload schema. Do not invent a live schema from the SQL file alone. [Supabase type-generation documentation](https://supabase.com/docs/guides/api/rest/generating-types)

## 7. Preserve and clean up Supabase integration

### Existing contracts inspected in the source

- Project URL: `https://pebgpdnaihnfjtbrjbto.supabase.co`.
- State table: `public.mrgymson_state` with `user_id`, JSONB `payload`, and `updated_at`.
- The local SQL setup describes `user_id` referencing `auth.users(id)` and RLS policies restricting reads/inserts/updates to `auth.uid() = user_id`. Actual live policies still need verification.
- Snapshot keys: `routines`, `selected`, `sessions`, `workout`, `profile`, `settings`, `favorites`, `customExercises`.
- Local guest cache: `mrgymson-mobile-v1`.
- Per-account cache: `mrgymson-user-<user-id>`.
- Legacy session cache: `mrgymson-auth-v1`.
- Pending login keys: `mrgymson-google-pending-v1`, `mrgymson-email-pending-v1`.
- Shared-routine recovery key: `gymson-incoming-routine`.
- Existing cloud writes are debounced by approximately 900 ms and upsert on `user_id`.
- Google currently returns an implicit-flow token fragment to the production root; email uses OTP creation and email-type verification.

### Target organization

1. `browser.ts` creates the typed browser Supabase client; `server.ts` creates a fresh cookie-aware client per request. Both use the public key plus the user's session, not service-role privileges.
2. `auth-actions.ts`, the PKCE callback and the refresh helper encapsulate email OTP, verification, Google authorization, verified server auth, cookie updates and sign-out.
3. `state-repository.ts` owns full JSONB snapshot reads/upserts; `account-reader.ts` performs only small server reads required by layouts/onboarding. Both use the existing table and preserve its RLS restrictions.
4. `sync-controller.ts` manages local-first writes, debounce, in-flight serialization, retries and visible sync status. Cancel stale timers on sign-out or account switch. An old user's pending write must never upload another user's state.
5. `storage/` handles the existing per-user cache contract and explicitly separates guest data from account data.

Use `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` for explicitly chosen public configuration. Configure Vercel Development, Preview and Production environments independently; never hardcode a production return URL into localhost or a preview. Put placeholders in `.env.example`, exclude `.env.local` from Git, and never expose service-role credentials or Google secrets. Any future server-only secret must be outside the `NEXT_PUBLIC_` namespace; none is needed for ordinary user-owned state access.

### Auth compatibility and callbacks

- Preserve email-code behavior and the existing Supabase email templates. Verify the configured OTP length instead of assuming six digits: the existing app accepts six to eight.
- Use the SSR SDK's PKCE flow for new Google logins and exchange the authorization code in `auth/callback/route.ts` with `exchangeCodeForSession`, writing session cookies before redirecting. Preserve the verifier and any supported flow identifier; do not discard SDK callback parameters. [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- Preserve `#routine=` handling in a browser entry component, because URL fragments never reach the server. Hold a pending shared routine across login redirects without including session tokens in sharing links.
- A legacy root token fragment requires a browser adapter; the server cannot read it. Accept it only during a bounded compatibility period, validate it and remove tokens from the URL before proceeding.
- Prepare exact localhost, chosen Vercel preview and production return URLs in Supabase before use. Do not blindly trust request Host/forwarded headers or allow arbitrary `next` redirect destinations.
- Do not change Google credentials or its Supabase callback URL unnecessarily. The app return URL is a separate redirect setting.
- Replace the hardcoded production-origin restriction with explicit environment-aware trusted origins for local development, Vercel previews and production.
- A legacy session adapter can read tokens only on an origin where that cache is accessible. For a same-origin bridge, validate a POST body with Zod, enforce the trusted request origin, initialize the SSR session with `setSession` and verify the actual user before setting cookies. Do not accept a submitted user ID as authority, expose tokens in logs or erase the old cache before success. On a different Vercel origin, users normally sign in again; cached-only workouts must be explicitly imported rather than silently lost. [Supabase setSession reference](https://supabase.com/docs/reference/javascript/auth-setsession)
- Only one auth implementation owns refresh-token rotation after cutover. Do not mount legacy and SDK refresh loops simultaneously.
- Protected Server Components, Route Handlers and Server Actions each verify authenticated claims/user with the request-scoped client and still rely on RLS. Do not treat client UI guards or refresh Proxy alone as sufficient authorization. Cookie changes belong in writable response contexts; preserve refresh cookies on redirects and never share auth responses through a public cache.
- Do not start writes until auth restoration and cloud/cache reconciliation have completed. A new app's initial default state must never overwrite a returning account.
- Guest-to-account import remains explicit and confirmed; do not merge another device's data invisibly.

### Database policy

Keep the current table and JSONB shape for phase one. No table renaming, normalization, data deletion, new storage buckets or additional auth providers are part of this migration.

The existing full-snapshot sync can still suffer cross-device last-write-wins conflicts. Document that limitation rather than claiming the rewrite fixes it. Atomic revisions/conditional writes and normalized tables can be separate, approved improvements after parity. Prevent local races and account-crossing writes now.

## 8. Ordered implementation phases — tests deferred

### Phase 0 — Freeze and inventory

- Record the current published version/source and preserve its build for rollback.
- Document legacy/current payload shapes and retain recoverable originals, including active workouts, seconds, photos, comments and supersets. Do not create or run test fixtures/suites yet.
- Record current catalog/image IDs and hash the assets; retain the excluded trasnuca pair unchanged.
- Inventory the existing behavior and preserve the old regression files as reference outside the new app; do not execute or port them yet.
- Read-only inspection of actual table columns, RLS policies, auth providers, redirect settings and email-delivery constraints when project access is authorized.

Deliverable: a feature/data preservation checklist and recoverable baseline. No live writes or behavioral tests are required in this phase.

### Phase 1 — TypeScript foundation and UI shell

- Scaffold Next.js App Router in the Desktop folder using Bun, with TypeScript, Tailwind, `src/`, and the `@/*` alias; choose compatible stable releases, record the Bun version and commit `bun.lock`.
- Configure strict TypeScript and the full Next.js runtime for Vercel; no static export and no test tooling.
- Install official shadcn/ui with Bun/`bunx` and only the primitives required by the screens being migrated.
- Port HERCULES tokens, branding, mobile bottom navigation and route shells.
- Copy optimized assets to `public/assets` without altering images or canonical exercise IDs.
- Establish React error/loading states and client boundaries; no global mutable window state.

Deliverable: server/client boundaries and the responsive UI shell are implemented. During implementation, a production build and type check may establish compilation only; they do not establish behavioral parity.

### Phase 2 — Domain schemas and legacy data adapters

- Extract catalog, translations, image variants, calculators and routine-generation logic into typed modules.
- Implement Zod schemas, versioned legacy adapters and typed state/reducer selectors.
- Separate transient UI/audio/GPS state from persisted account state.
- Implement non-destructive conversion with raw-data backups and preservation of unknown fields. Automated round-trip tests are deferred.

Deliverable: typed contracts and compatibility adapters are implemented; behavior remains unverified by tests at this stage.

### Phase 3 — Supabase auth and synchronization

- Implement browser/server SSR clients, Proxy refresh, auth Server Actions, PKCE Route Handler, protected server layouts, typed repositories and the sync controller described above.
- Port welcome, OTP, Google callback, profile onboarding and session restoration.
- Preserve cache keys and per-user isolation; make import decisions explicit.
- Implement handling for errors, offline cache, refresh, retries, sign-out and account switching. Defer auth/RLS behavioral tests; do not use real users' accounts for unrequested validation.
- Keep full photo-heavy snapshot transport direct to Supabase and small server reads/actions separate, without bypassing RLS.

Deliverable: authentication and persistence code are migrated. External setup requirements and untested paths are reported honestly; no test pass is claimed.

### Phase 4 — Main workout journeys

- Port home/routines, library, exercise picker, favorites and custom exercises.
- Port active workout inputs, both layouts, multiple folds, supersets and image/technique dialogs.
- Port calendar logging/editing/copy/paste and workout-finish attachments.
- Port profile/settings, including dirty-only save, photo drafts and identity-based images.
- Preserve the shared-routine schema/remapping rules; create new links for the configured Vercel origin and document old-origin forwarding and cache-import requirements.

Deliverable: the create-routine → train → finish → view/edit calendar flow is implemented with the existing data contracts. End-to-end validation is deferred.

### Phase 5 — Tools, progress and sharing

- Port calculator formulas without changing their calculations. Golden-result tests are deferred.
- Port progress comparison logic without inventing new metrics.
- Port clock engines and combat audio as lifecycle-managed TypeScript controllers; avoid intervals tied to component remounts. Use deadline-based timing.
- Port GPS permissions, tracking points and route display; preserve existing background limitations rather than promising native tracking.
- Port canvas workout posters, download and Web Share capability checks.
- Port unit changes and existing languages; keep private profile/body notes out of share images.

Deliverable: tools, progress and sharing are ported; physical-device/browser restrictions and the absence of behavioral testing are documented.

### Phase 6 — Vercel packaging, authorized deployment and rollback

- In implementation, use `bun run typecheck` and `bun run build` for compilation only. Do not create/run unit, integration, Playwright, browser or manual behavioral tests unless the user later requests them.
- Configure Vercel's Next.js framework deployment using the standard build, not an `out/` upload or the old Sites publication helper. Use `next start` only for local runtime when requested, not as a custom Vercel start command.
- Configure Vercel's install command as `bun install --frozen-lockfile` and build command as `bun run build`; commit `bun.lock` and keep the selected Bun version consistent with deployment. Retain the Node.js server runtime.
- Configure isolated Vercel environment variables and trusted auth origins; avoid unintended production writes from previews.
- Keep personalized responses private/non-cacheable and large snapshot reads/writes outside function payload limits.
- Preserve image mappings, IDs and backward-readable payloads by construction; do not label them tested.
- Once deployment is separately authorized, create/connect the Vercel project and chosen production URL. Updating the old site for a redirect/cache handoff is a separate scoped cutover action.
- Retain the old frontend and a prior Vercel deployment for rollback. Do not delete old local caches, revoke all users' sessions or change the database schema as a cutover shortcut.
- If a release is requested before behavioral tests are re-enabled, explicitly identify it as untested; a successful build/deployment is not proof that all user journeys work.

Deliverable: a full Vercel-compatible Next.js build and deployment/rollback instructions. Deployment remains separately authorized and behavioral verification remains deferred.

## 9. Deferred verification checklist — do not execute now

The following checks are retained only as a future coverage list. No test framework, suites, browser QA or test runs are included in the present scope. Runtime Zod validation is application functionality, not a test suite.

- [ ] TypeScript strict checks pass; no authored `.js` application/test/script files or suppressed type errors.
- [ ] Zod validates external inputs and stored payloads; invalid saved data is not automatically overwritten.
- [ ] Existing account IDs and table remain intact; RLS blocks cross-user reads/writes.
- [ ] Returning users load cloud/cache state before writes; session conversion is non-destructive.
- [ ] OTP and Google login work on configured allowed origins; callback/shared-link collisions are covered.
- [ ] Signing out and account switching clear transient state and stale writes.
- [ ] A local edit persists without a tick, survives reload and syncs to an isolated second session.
- [ ] Weight/repetitions/seconds, units, dates and previous-result copying match the current behavior.
- [ ] Supersets and custom exercises survive shared-routine import and local/cloud round trips.
- [ ] Calendar colors, multiple workouts, notes, photos and body-weight fields survive editing/copy rules.
- [ ] All assets decode and all profile image variants select correctly; image dialogs show full images.
- [ ] Combat signals fire at the correct phases without duplicates on pause/resume; unsupported audio/GPS/share states have honest feedback.
- [ ] The original UI look, navigation and responsive usability are retained.
- [ ] Email delivery, browser background behavior and conflict limitations are not falsely claimed as solved.
- [ ] No menstrual-cycle feature, official social OAuth or new payment functionality is added.
- [ ] Vercel production/preview origins, old links, cache handoff, private responses and rollback behave as intended.
- [ ] Full snapshots containing many photos work without a Vercel function-size regression.

## 10. Scope boundaries and unresolved checks

This planning task does not create the implementation, run Next.js, modify Supabase, configure SMTP/OAuth, migrate live records or publish a release.

Before implementation, inspect the live Supabase schema/policies and required access only as authorized. The current local SQL and source show intended integration, not a fresh audit of the hosted project's configuration. Do not perform auth/data-access tests for now.

Default decisions are now: full Next.js App Router on Vercel, TypeScript throughout, shadcn/ui, Zod, `@supabase/ssr` cookie auth, PKCE callbacks, protected server layouts, Server Actions/Route Handlers, and direct typed large-snapshot transfers to the existing Supabase table. No static export, database redesign, new features or testing work is included. The chosen Vercel URL, preview-access policy and old-origin cache/link handoff still need to be resolved during implementation/cutover.

## Official reference links

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel package managers and Bun lockfile detection](https://vercel.com/docs/package-managers)
- [Bun lockfiles](https://bun.sh/docs/pm/lockfile)
- [Bun install and frozen lockfiles](https://bun.sh/docs/pm/cli/install)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Vercel Function payload limits](https://vercel.com/docs/functions/limitations)
- [Next.js Server Action payload limits](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
- [shadcn/ui for Next.js](https://ui.shadcn.com/docs/installation/next)
- [Zod parsing, validation and inferred types](https://zod.dev/basics)
- [Supabase database type generation](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase session initialization](https://supabase.com/docs/reference/javascript/auth-setsession)
- [Supabase SSR clients and refresh](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
