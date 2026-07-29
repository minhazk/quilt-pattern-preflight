# Deployment

Use separate Neon branches and Stripe sandbox/live environments.

## 1. Neon

1. Create the project and enable Neon Auth and Data API.
2. Apply `neon/migrations/0001_initial.sql` to an isolated branch.
3. Verify table count, RLS policies, grants, rules and storage trigger.
4. Apply the same forward migration to the empty production branch.
5. Set an operator’s protected profile role to `operator`; use `admin` only
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

## 4. Cloudflare web

Set root directory to `apps/web` and install/build commands to:

```text
pnpm install --frozen-lockfile
pnpm --filter @preflight/web build:cloudflare
pnpm --filter @preflight/web exec wrangler deploy --dry-run
pnpm --filter @preflight/web exec wrangler deploy
```

Set all variables from `.env.example`; crucially:

```text
DEV_AUTH_ENABLED=false
NEXT_PUBLIC_APP_URL=https://<web-host>
PREFLIGHT_API_URL=https://<service-host>
```

Never expose variables without `NEXT_PUBLIC_`.

## 5. Release verification

- Password sign-up/sign-in
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
