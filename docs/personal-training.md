# Personal

`#/personal` is the third CourtHub workspace, separate from team training and the coached Individual pilot. It has its own navigation (overview, plan, train, history, account), eight editable starter sessions, freely adjustable dates and exercise doses, optional additional sessions, actual exercise results, pain before/after training, effort and duration, and a separate next-day report. The initial template is a cautious home/court loading block for users cleared for sport with patellar tendinopathy. It does not automatically prescribe later return-to-sport stages.

## Ownership and storage

`/api/individual/personal` is dispatched inside the existing bundled function; no additional Vercel function is introduced. The handler authenticates every request. The sole owner is the JWT subject; user/profile/organization identifiers in request bodies or query parameters never select records. Team coaches and administrators have no special access to another user's Personal records.

Data lives in the additive `personal_training` table, keyed by user, separate from the team workspace and Individual tables. Initialization is idempotent on the first authenticated request, so existing installations need no manual credential transfer or deployment-time migration. The equivalent SQL migration is included for managed migration workflows. Existing training and Individual data is not migrated or deleted.

PUT uses an expected version (zero for first creation), validates all persisted fields, and rejects stale writes with 409. The client keeps form drafts scoped by account and route on this device, including when saving fails. After a conflict, reload fetches current server state while preserving unsaved form fields. Logout clears local Personal drafts. The service worker caches code only, never the authenticated API response. Server error logging excludes personal request bodies.

## Loading guidance

Mild stable symptoms only, cautious initial ceiling 3/10; symptoms should return to the usual baseline by the next morning. Missing next-day data never displays a successful-recovery state. New swelling, locking or giving way takes precedence over numeric pain. Later strengthening, jumping, changes of direction and return to play are not automatically unlocked by session count. Treating clinicians' instructions take precedence. Sources are linked in the workspace and `js/personal-core.mjs`.

## Validation

`npm run test:personal` covers template schedule, invalid dates/doses, duplicate identifiers, authentication, account isolation, stale writes, symptom-state decisions, actual DOM forms, draft recovery and saving. The existing serverless-router, Individual UI and PWA checks cover integration boundaries. No fabricated workout or symptom records are seeded.

## Comprehensive rehab schedule

The settings form can replace planned sessions with a 7–84 day schedule while retaining every existing training record. Monday is light individual court work; Tuesday and Friday are progressive home strength, Wednesday a light optional home/court alternative, Thursday/Sunday recovery, Saturday upper-body/core. The planner includes an explicit plan guide, equipment and exercise alternatives, proposed loading stages and criteria for repetition/regression and eventual return to sport. Stages are never unlocked by date alone. Optional/recovery days do not block the next core session or count toward the core-workout total.

For longer plans, the Plan page defaults to a single selected week. All weeks remain accessible. No private diagnosis, personal dates or account data is published in source code; the template is general and personal choices are saved only in the authenticated user record.
