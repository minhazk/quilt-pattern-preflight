# Deployment

Use separate staging and production Supabase and Stripe projects.

## 1. Supabase

1. Create the project and record URL, publishable key and secret key.
2. Link the CLI: `pnpm exec supabase link --project-ref <ref>`.
3. Review the pending migration: `pnpm exec supabase db push --dry-run`.
4. Apply it: `pnpm exec supabase db push`.
5. Run database lint/advisors and verify all tables and Storage objects retain
   RLS/private access.
6. Configure Auth site URL and callback
   `https://<web-host>/auth/callback`.
7. Set an operator’s Auth `app_metadata.role` to `operator`; use `admin` only
   for refund/credit administration.

Do not reset or clear a shared database. Apply forward migrations.

## 2. Preflight service

Build `services/preflight/Dockerfile` with that directory as context. Set:

```text
ENVIRONMENT=production
PREFLIGHT_API_SECRET=<random 32+ byte secret>
PREFLIGHT_EXPOSE_DOCS=false
```

Deploy to Railway, Render or Fly.io, keep it private where supported, and verify
`GET /health` returns `{"status":"ok","engine":"deterministic"}`. Limit inbound
traffic to the web host when the provider supports it.

## 3. Stripe test mode

Create one-time GBP prices for £20 and £49, configure the web environment, add
`https://<web-host>/api/webhooks/stripe`, and subscribe to
`checkout.session.completed`. Complete one test checkout and confirm exactly one
event, payment and positive credit row. Replay the same event and confirm no
second credit is created.

Do not enable live mode until the full paid flow and refund procedure pass.

## 4. Vercel web

Set root directory to `apps/web` and install/build commands to:

```text
pnpm install --frozen-lockfile
pnpm --filter @preflight/web build
```

Set all variables from `.env.example`; crucially:

```text
DEV_AUTH_ENABLED=false
NEXT_PUBLIC_APP_URL=https://<web-host>
PREFLIGHT_API_URL=https://<service-host>
```

Never expose variables without `NEXT_PUBLIC_`.

## 5. Release verification

- Magic link and callback
- Cross-user project denial
- £20 and £49 signed checkout fulfilment and replay
- DOCX and text-layer PDF upload/extraction
- Confirmation and atomic credit consumption
- Operator audit, suppression/manual finding and release
- Approved PDF download
- Revision before/after deadline
- Feedback and consent
- Immediate raw/project deletion

Rollback application deployments independently. For schema issues, add a
forward corrective migration; do not reset production data.
