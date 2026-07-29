# Architecture

The customer-facing Next.js application owns authentication, private workflow
orchestration, billing and report delivery. The FastAPI service is an internal,
secret-authenticated deterministic computation boundary. Neon provides Auth,
Postgres and a Data API; raw files are held in Postgres under a hard 200 MiB
application budget.

```mermaid
flowchart LR
  C["Customer browser"] --> W["Next.js web"]
  O["Operator browser"] --> W
  W --> A["Neon Auth"]
  W --> D["Neon Postgres with RLS"]
  W --> P["FastAPI preflight service"]
  W --> T["Stripe Checkout"]
  T --> H["Signed webhook"]
  H --> D
  P --> X["DOCX/PDF extraction"]
  P --> R["Exact-fraction rules"]
  P --> F["Approved snapshot PDF"]
```

## Trust boundaries

- Browser input is untrusted. Server Actions re-authenticate and validate it.
- The Neon database URL, Stripe secret, webhook secret and service secret are
  server-only.
- Customer database access uses request-scoped Neon Data API clients and RLS.
- Privileged SQL is limited to signed payment fulfilment and sanitized
  analytics ingestion.
- Operator roles come only from protected database records.
- The preflight service never receives Stripe or Neon credentials.
- The browser never marks a payment successful; a signed webhook calls an
  idempotent SQL function.

## Data flow

1. A supported file is size/MIME/extension checked and rate limited.
2. The internal service validates extractable text and produces source-linked
   proposals.
3. The raw file, metadata, SHA-256 and retention deadline are stored privately
   in Neon; a database trigger enforces the total storage ceiling.
4. The customer corrects proposals and declares a narrow canonical simple-grid
   relationship.
5. An atomic SQL function consumes a credit exactly once.
6. Exact-fraction rules create versioned, explainable findings.
7. An operator approves, suppresses, edits through notes, or adds a manual
   source-linked finding. Database triggers retain before/after snapshots.
8. Release persists an approved snapshot. PDF download renders that snapshot,
   never an unreviewed rerun.
9. Version two reuses assumptions and classifies findings as resolved,
   remaining, or new.

The pilot uses synchronous service calls to keep operations legible. A durable
queue is a later scaling option, not required for the validation volume.
