# Cricket AI Analyzer

AI-powered cricket video analysis: players upload a batting or bowling clip
and get a structured report (strengths, improvement areas, practice drills)
plus a generated 7-day practice plan, with Razorpay subscription billing.

## Layout

- `frontend/index.html` — the whole client app (landing page, auth, dashboard,
  upload flow, reports, practice plans, billing). Single self-contained file.
- `backend/supabase/migrations/` — Postgres schema, run in order:
  - `001_analysis.sql` — analyses table, error log, private video storage bucket
  - `002_practice_plans.sql` — practice_plans table
  - `003_billing.sql` — plans, subscriptions, payments, webhook_events,
    plus the `billing_state` and `claim_analysis` functions usage limits rely on
  - `004_rls_perf.sql` — perf fix: RLS policies re-checking `auth.uid()` per row
  - `005_profiles.sql` — profiles table (name, age group, level, hand, role,
    batting/bowling preference) + trigger that auto-creates a profile row on signup
  - `006_lock_trigger_fn.sql` — security fix: the signup trigger function was
    callable directly via the REST API; this locks it to trigger-only use
- `backend/supabase/functions/api/` — the Supabase Edge Function (Deno):
  - `index.ts` — all HTTP routes (uploads, analyses, plans, billing)
  - `razorpay.ts` — the only file that talks to Razorpay; signature
    verification for both Checkout and webhooks lives here

## Status

**Deployed and live** in a real Supabase project (`zobkzuotlsfjnwwmtnjn`,
ap-south-1 / Mumbai): all 6 migrations applied, the `api` Edge Function
deployed, security advisor clean. Real Supabase Auth is wired into the
frontend — sign up, log in, log out, forgot/reset password, persistent
session, and a profile form that saves to the real `profiles` table. The
signup trigger was tested directly against the live database (test user
created, profile row auto-created, then cleaned up).

**What's NOT done yet:**

- **`CFG.api` is unset** in `frontend/index.html`, so uploads/analysis/billing
  still run against local stand-ins. The Edge Function itself is deployed and
  ready, but:
  - Its secrets aren't set yet (see below) — every request will fail until they are.
  - Point `CFG.api` at `https://zobkzuotlsfjnwwmtnjn.supabase.co/functions/v1/api`
    once secrets are set and you're ready to turn this on.
- **No live network testing has been possible from the build environment**
  (sandboxed, no outbound network access) — auth was verified by direct
  database inspection, not by driving a real browser session. And a
  Claude-hosted preview link can't make live calls to outside services at
  all, so real testing needs this file deployed on actual hosting.
- **Two Supabase dashboard settings still need a manual decision** (no API
  covers these):
  - Authentication → Sign In → Email → "Confirm email" (on or off — the code
    handles either)
  - Authentication → URL Configuration → Site URL / Redirect URLs — must
    include wherever you deploy `frontend/index.html`, or confirmation/reset
    email links will point to the wrong place
- **Analyses/plans are still cached client-side** (localStorage) as a listing
  mirror — there's no "list all my analyses" endpoint yet, so switching
  browsers loses the list even though server-side data is intact.

## Backend setup (once you're ready to turn on `CFG.api`)

1. Secrets (dashboard or CLI):
   ```
   supabase secrets set --project-ref zobkzuotlsfjnwwmtnjn \
     GEMINI_API_KEY=... GEMINI_MODEL=... ALLOWED_ORIGIN=... \
     RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=... \
     RZP_PLAN_PLAYER=... RZP_PLAN_PRO=... RZP_PLAN_ACADEMY=...
   ```
2. Point Razorpay's webhook at
   `https://zobkzuotlsfjnwwmtnjn.supabase.co/functions/v1/api/billing/webhook`
3. Set `CFG.api` in `frontend/index.html` to
   `https://zobkzuotlsfjnwwmtnjn.supabase.co/functions/v1/api`

Supabase connection details already in use by the frontend:
- Project URL: `https://zobkzuotlsfjnwwmtnjn.supabase.co`
- Publishable key: `sb_publishable_2RILvfLcdEcZ4XaQLPLWaQ_imHsxJqk`
