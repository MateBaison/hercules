# Data compatibility contract

The existing Supabase table remains `public.mrgymson_state` with `user_id`, `payload` and `updated_at`. No hosted schema, policy or records were changed by this implementation. The archived SQL is a reference, not a fresh audit of actual RLS. The repository validates returned rows with Zod; no fabricated live-generated database type is claimed.

Snapshots retain routines, selected routine, sessions, active workout, profile, settings, favorites and custom exercises, plus unknown fields at every persisted object level. Old aggregate sessions need not contain individual sets. Retired exercise history is not deleted. Null blanks, nullable historical durations, string profile weights/heights, photos, notes, original done/entered flags and unknown metadata survive reads/round trips.

Saved data uses tolerant Zod readers; new commands use bounded/strict input schemas. Missing fields can receive compatible defaults; malformed data returns an explicit error instead of silently becoming an empty account. Seconds and repetitions remain distinct. New logged sets save input without a tick; untouched default values are not invented as completed sets.

## Persistence and recovery

- Verified account UUID owns its provider, local cache and repository.
- Account keys remain `mrgymson-user-<UUID>`; the legacy guest key is preserved, never automatically uploaded into another account.
- Initial cloud read/reconciliation happens before writes; initial defaults are not automatically uploaded.
- Local input persistence is immediate. Cloud uploads debounce 900ms, run serially and capture edits made during an in-flight upload.
- Failed cloud reads allow local cached editing but block cloud uploads until recovery. Disposed account work cancels requests/timers.
- Original raw cache backups use `<key>:migration-backup-v1:<timestamp>`. Divergent copies require an explicit choice and preserve fingerprinted local/cloud conflict backups. A failed backup blocks replacement.
- Profile, workout completion and sign-out can flush explicitly. Upload errors remain visible; a pending local save must not be called a successful cloud save.
- Full photo-heavy payloads go directly browser → Supabase under the user's session/RLS. Server summary reads select only small profile fields. No service-role key is used.
- Browser saves now use conditional updates against the loaded `updated_at` revision, or an insert for an absent account row. Stale updates and duplicate inserts reconcile again and require an explicit choice with backups. This uses existing RLS and columns; no hosted schema migration is required. It is not a realtime merge, and old clients still using unconditional upserts must be refreshed.
- Clean accounts check the small `updated_at` field on focus/visibility and every 30 seconds while visible, loading full snapshots only when it changes. Pending edits and uploads are not replaced by polling. A clean cache matching its saved base accepts a newer cloud copy; unrelated or pending divergent copies still require a choice.

## Origin handoff

New Vercel origins cannot access the old site's storage/cookies. Reauthentication restores cloud data only; explicit export/import handles unsynced old-origin data. Profile JSON exports include private records/photos and must not be publicly shared. Routine links and workout posters intentionally omit private profile fields, body weights, photos and exercise notes.

Historical set editing preserves untouched original fields/totals where only metadata changes. Calendar copies receive independent IDs/date and omit original photos/body weights. All optimized image assets and original baseline files are verified by SHA-256.

The original 136 exercise definitions and archived images remain unchanged. Three additions (side plank, prone Superman and prone alternating contralateral lumbar raises) are defined separately in `src/data/additional-exercises.json`, with new male/female image paths in `additional-image-variants.json`. Side plank uses seconds; both lumbar movements use repetitions. Existing quadruped Superman and prone trunk-extension IDs remain readable and available. The archived SHA-256 baseline is not regenerated for additions.

Optional `trackingSessions` store private running/cycling routes separately from strength-training sessions: id, start date, mode, durationSeconds, distanceMeters and chronological GPS points (lat/lon/time/speed). Existing accounts need no new collection until a route is saved. Finalizing an activity with at least two GPS points saves via `useApp().change`, preserving normal local/cache/cloud reconciliation. Route display uses Leaflet with a MapLibre/OpenFreeMap Positron basemap, removing symbol layers (labels and POIs); GPS recording continues if map tiles fail. Full exports include routes; routine sharing and workout posters do not. Unfinished routes are transient and are lost on reload. Saved routes are bounded to 10,000 sampled points with endpoints retained; measured distance is retained separately, not recomputed from the sampled line. Browser background GPS remains platform-dependent. Map tiles use normal HTTP caching and visible attribution; no offline tile prefetch or key is configured.

## Optional menstrual calendar

`profile.menstrualCalendar` optionally stores `enabled` and an array of local calendar dates (`YYYY-MM-DD`) with menstrual bleeding. Existing accounts need no new fields. Unknown metadata is preserved. Disabling the feature keeps recorded dates; clearing them requires profile saving. These private dates are included in full account backups but excluded from routine sharing and workout posters. Masculine profiles (`hombre`, legacy `male` or `masculino`) suppress the activation control, training-calendar menstrual borders/legend and the menstrual readiness prompt, without deleting or changing stored dates or the enabled flag. Switching back restores the saved setting. This basic calendar does not predict phases, fertility or prescribe training changes.

When the menstrual calendar is enabled, selecting a routine day offers an optional pre-workout wellbeing check (pain, energy and sleep). Answers and advice are transient and never added to account snapshots or shared outputs. Advice does not automatically alter routines, recorded loads or session data. Severe pain receives guidance to rest and seek medical advice. Clinical reference: https://www.nhs.uk/symptoms/period-pain/ . The advice uses reported symptoms, not inferred cycle phases.

Performed sets may include a `type` string (`warmup`, `normal`, `failure`, `drop`). Missing or unrecognized values display as normal; historical values remain readable. Selecting a type alone does not mark a set as entered or completed. Completed sessions and account backups retain the type; volume/count calculations remain unchanged.

In-workout exercise replacement only edits the active workout. Entered/done sets remain under their original exercise; pending sets become a new entry when needed. Saved routines and historical sessions are unchanged. Suggestions reuse the pending count and comparable quantity, or target-exercise history with weight-unit conversion. There is no inferred conversion of loads across exercises, or repetitions to seconds. Suggested values remain `entered: false` / `done: false` until the user records them. Type names/letters are localized while stored identifiers stay stable.

## Weekly training time

Personal record highlights are derived from recorded sets for the same exercise and metric before the workout/session date. They indicate a higher historical load, or more repetitions/seconds at an equivalent load (converted between kg/lb with a 0.05 kg tolerance). Ties, untouched defaults, unknown aggregate-only history and a first performance are not records. Earlier valid sets in the current exercise also become comparison points. No record flags or calculated values are written into historical snapshots.

Sessions may store an optional `rating` (`excellent`, `good`, `okay`, `bad`, `very_bad`) selected when finishing or editing a workout. Existing sessions remain unselected; historical unknown values are preserved until explicitly replaced. Ratings remain private account data and are not added to routine shares or workout posters.

Session `duration` retains its historical unit, minutes. New completed workouts record elapsed time from `workout.started` to saving, including rests and time with the app in the background. Unknown historical durations remain null/absent and are explicitly excluded from weekly time totals. Calendar copies retain their existing null-duration behavior. Week boundaries and daily grouping use local dates, Monday through Sunday.

Entering Tracking requests one current location fix to center the live map. A late fix cannot overwrite a route that has started; permission failures leave manual centering and GPS controls available. Saved route dialogs do not request the current position. This preview fix does not record an activity or upload coordinates.
