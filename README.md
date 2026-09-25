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
- `backend/supabase/functions/api/` — the Supabase Edge Function (Deno):
  - `index.ts` — all HTTP routes (uploads, analyses, plans, billing)
  - `razorpay.ts` — the only file that talks to Razorpay; signature
    verification for both Checkout and webhooks lives here

## Status / what's NOT done yet

This is mid-build, not production-ready:

- **No real authentication yet.** `frontend/index.html` currently has a
  browser-only stand-in for login (accounts live in localStorage). It needs
  to be replaced with real Supabase Auth before `CFG.api` is turned on.
- **`CFG.api` is unset**, so the frontend runs against local stand-ins for
  storage/AI/billing. Point it at your deployed Edge Function URL once
  Supabase Auth is wired in.
- **Nothing has been deployed or run end-to-end.** The backend was written
  and read carefully but never executed against a live Supabase or
  Razorpay account.

## Backend setup (once auth is wired in)

1. `supabase db push` (runs the migrations above, in order)
2. Set Edge Function secrets: `GEMINI_API_KEY`, `GEMINI_MODEL`,
   `ALLOWED_ORIGIN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, `RZP_PLAN_PLAYER`, `RZP_PLAN_PRO`,
   `RZP_PLAN_ACADEMY` (Razorpay plan IDs for the ₹99/₹149/₹499 plans)
3. Deploy: `supabase functions deploy api --no-verify-jwt` (the `--no-verify-jwt`
   is required because the Razorpay webhook route has no Supabase user token;
   the function checks user tokens itself on every other route)
4. Point Razorpay's webhook at `.../functions/v1/api/billing/webhook`
