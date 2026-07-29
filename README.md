# Quilt Pattern Mathematical Preflight

An operator-assisted paid validation pilot for checking arithmetic consistency
inside completed quilt-pattern manuscripts. It accepts supported DOCX and
text-layer PDF files, extracts source-linked values, asks the customer to
confirm a canonical model, runs deterministic exact-fraction rules, and holds
the result for disclosed human quality control before release.

It does **not** replace technical editing, pattern testing, construction
judgement, or the designer’s final review.

## Repository

```text
apps/web/             Next.js customer, operator and Stripe application
services/preflight/   FastAPI extraction, rules and approved-PDF renderer
packages/contracts/   Shared Zod contracts and state-machine tests
fixtures/             20 synthetic DOCX/PDF files and hand-declared goldens
neon/                  SQL schema, RLS and hard-capped private file storage
docs/                  Product, operational, validation and deployment guides
```

## Prerequisites

- Node.js 24 or newer
- project-pinned `pnpm@11.16.0`
- Python 3.12
- Stripe CLI for local webhook forwarding

Do not substitute npm for the project-pinned pnpm version.

## Minimal local setup

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
python3.12 -m venv .venv
.venv/bin/pip install -e 'services/preflight[dev]'
```

Leave the Neon variables empty to use the read-only sample adapter, or copy a
Neon branch's Auth, Data API and pooled database values into `.env.local`.
Start the services in separate terminals:

```bash
pnpm dev:service
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). With Neon variables
empty and `DEV_AUTH_ENABLED=true`, the clearly labelled sample adapter is
available. It never writes a pretend customer record.

## Database

Apply `neon/migrations/0001_initial.sql` to an isolated Neon branch first, then
promote the verified forward migration. Never reset or clear a shared or remote
database. Operator access is granted through the protected `profiles.role`
record; editable browser claims are never trusted for authorisation.

## Stripe test setup

Create two one-time GBP Prices in Stripe test mode:

- £20 → `STRIPE_PRICE_ONE_PATTERN`
- £49 → `STRIPE_PRICE_THREE_PATTERNS`

Set the Stripe test secret and forward signed events:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the displayed `whsec_…` value to `STRIPE_WEBHOOK_SECRET`. Checkout credits
are written only after the signed `checkout.session.completed` event passes
currency, amount, product, owner and paid-state checks. The SQL RPC makes event,
payment and credit insertion atomic and idempotent.

## Fixtures, reports and tests

```bash
pnpm fixtures
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm check
```

`pnpm fixtures` regenerates the 20 synthetic manuscripts but never rewrites the
hand-declared golden expectations. To regenerate the checked-in synthetic sample
PDF:

```bash
pnpm sample:report
```

The public sample is at `apps/web/public/sample-preflight-report.pdf`.

## Deployment

The web app is deployed as the `quiltpreflight` Cloudflare Worker at
[preflight.emkayfoundry.com](https://preflight.emkayfoundry.com). Neon provides
Auth, Postgres and the Data API. The deterministic Python service remains a
separate deployment boundary.
Set `DEV_AUTH_ENABLED=false` in every production environment. Exact sequencing,
health checks, secrets and rollback boundaries are in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Troubleshooting

- `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`: run
  `pnpm install --force` from a login shell, then rerun `pnpm check`.
- Next build cannot fetch Google fonts: allow outbound access to
  `fonts.googleapis.com` during build.
- Upload returns 422: confirm the file is DOCX or a PDF with selectable text,
  under 15 MB, and within the supported scope.
- Checkout redirects but no credit appears: inspect the Stripe test event,
  webhook signature secret, and Neon `stripe_events`/`payments` records.

## Product status

This repository implements an **operator-assisted paid pilot**. External
Stripe sandbox end-to-end fulfilment, the Python computation deployment and
email delivery must still be verified before accepting payments. The Neon
migration and RLS inventory are verified in the target project. See
[docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).
