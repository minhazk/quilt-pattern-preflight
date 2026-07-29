# Operator guide

## Access

Use a dedicated Supabase Auth account with `app_metadata.role=operator`. Never
share accounts. Opening `/admin` lists unreleased work and validation metrics.

## Review procedure

1. Start the review so processing time is recorded.
2. Verify file metadata, extraction status and confirmed assumptions.
3. Compare each normalized value with its cited excerpt/page.
4. Recalculate the displayed formula independently where material.
5. Approve accurate findings, suppress false positives with a reason, and add a
   manual source-linked finding only when necessary.
6. Request clarification rather than guessing an ambiguous relationship.
7. Release only after every automated finding has a decision and unsupported
   conditions are explicit.

Release creates a 14-day revision window for version one. Version two closes the
project after release. Every finding/review insert, update or deletion captures
actor, before value, after value and timestamp.

## Payments and deletion

Credits are webhook-created. Never grant value based on a customer screenshot.
Handle Stripe refunds in Stripe first, then reconcile the ledger; do not delete
financial records. Process queued account deletion only after refund/chargeback
obligations are resolved, then remove private Storage objects and Auth identity.

Never put manuscript content into email, analytics, logs or support tools.
