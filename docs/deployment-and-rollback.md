# Vercel deployment and rollback

The implementation is prepared for a full Next.js deployment. Publication/cutover is not performed or implied by local checks. The existing frontend and Supabase project remain unchanged.

## Configure Vercel

1. Import the new project/repository or select this folder through an authorized Vercel workflow.
2. Use the Next.js framework preset, project root, Node.js 24.x (or a supported 20.9+ runtime), install `bun install --frozen-lockfile`, and build `bun run build`.
3. Retain `bun.lock`. Do not set static export, an `out/` output directory or a custom start command.
4. Set `NEXT_PUBLIC_SUPABASE_URL` to the existing Supabase project URL and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its public publishable key.
5. Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS deployment origin, with no path. Use a stable preview URL rather than arbitrary changing preview URLs. Configure Preview and Production environments separately and rebuild after changes.

The local `.env.local` is ignored. Do not commit or upload credentials, tokens, exports or user data. The publishable key is intended for browser use; access security depends on RLS. No service-role key or Google OAuth secret is used by the Next.js app.

## Supabase/Google return URLs

Under Supabase Authentication → URL Configuration, retain the old application's allowed URL until cutover and add exact new callback URLs:

- Local: `http://localhost:3000/auth/callback`
- New stable preview: `https://YOUR-PREVIEW-ORIGIN/auth/callback`
- Production: `https://YOUR-PRODUCTION-ORIGIN/auth/callback`

Set Supabase Site URL to the intended production origin when the release is authorized. Avoid broad production redirect wildcards. Google Cloud's authorized redirect remains the existing Supabase callback:
`https://pebgpdnaihnfjtbrjbto.supabase.co/auth/v1/callback`.
Do not replace that with the app callback; Google → Supabase and Supabase → app are different hops.

Keep the existing email provider/template containing `{{ .Token }}`; this app verifies email OTP codes. Email delivery/rate limits and Google consent configuration are managed in Supabase/Google, not guaranteed by the local build.

The temporary legacy fragment-session bridge is **off by default**. Only enable `LEGACY_AUTH_COMPAT_UNTIL` with an explicit future ISO timestamp if an authorized transition requires it; remove it after the bounded window. It verifies the session remotely and removes URL fragments before sending tokens.

## Required real integration/release gate

- Verify a real new email account, onboarding, sign-out and session restoration.
- Verify Google consent, PKCE return, refreshed cookies and trusted-origin errors.
- Audit the existing table/policies: `mrgymson_state.user_id` must remain owner-restricted through `auth.uid()`; authenticated accounts must not read/write another UUID, and anonymous access must not expose snapshots.
- Use consenting test accounts: save routines, a workout, notes/photo/preferences; confirm them from a second browser/device.
- Confirm offline edits/retry and recovery choices without silently replacing data.
- Check real phone GPS permissions, routes and audible combat cues in foreground; browser/background limitations are intentional.
- Check deep links, shared routines, and a clean mobile browser after deployment.

The mock service validates local client/server wiring and ownership behavior, **not hosted RLS, Google consent, email delivery or physical GPS**. Database types were not generated from live access; actual returned data is validated with Zod.

## Data handoff and rollback

No schema rewrite or destructive SQL is part of this migration. Keep `public.mrgymson_state`, its columns and user UUIDs. Photos remain in the compatible JSON snapshot; no new Storage bucket was introduced.

A new origin cannot read old localStorage or auth cookies. Cloud records return after signing into the same account; old-origin unsynced drafts need a private JSON export/import. The new Profile screen includes explicit export/import with confirmation and a local recovery copy. Old sharing links are not automatically redirected to Vercel; choose forwarding behavior before cutover.

Avoid concurrently editing the same account in old/new frontends during the handoff: saves remain full-snapshot last-write-wins, not multi-device merging or realtime subscription. Keep the old frontend, immutable migration baseline and previous Vercel release. Roll back the frontend/configuration without deleting cloud records or revoking everyone's sessions.
