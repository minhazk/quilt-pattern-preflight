# Security and privacy

Customer manuscripts are unpublished commercial intellectual property.

## Implemented controls

- Neon Auth with request-scoped Data API clients
- RLS on every public table; ownership helpers for projects/documents
- Operator/admin authority from protected database records
- Private Postgres file storage, 15 MB per-file limit and 200 MiB total hard cap
- Extension and MIME agreement, random paths, SHA-256 metadata and text-layer
  validation
- 30-day raw-file deadline, immediate raw deletion, permanent project deletion,
  and queued account deletion
- HTTPS-dependent providers and no public raw-file URLs
- No document text, excerpts, filenames or measurements in analytics
- No document contents in application error messages or ordinary logs
- Deterministic calculation path; optional LLM extraction is disabled and
  unimplemented
- Signed Stripe webhooks and amount/currency/product validation
- Atomic, idempotent payment/credit fulfilment and serialized credit spend
- Database-backed upload/analytics rate limits
- Operator before/after audit records for every finding and review mutation
- Private/no-store auth and PDF responses; security headers and frame denial
- PDF generated from the released snapshot

## Operational controls

- Keep service-role, Stripe and preflight service secrets server-only.
- Rotate secrets after any suspected exposure.
- Monitor file-retention deletion jobs and the hard storage budget.
- Review operator access quarterly and remove stale roles.
- Use separate Stripe sandbox/live environments and Neon branches.
- Never place customer excerpts in support tickets.

## Known gaps before live production

Stripe sandbox checkout and the Python service must be verified end to end.
Rate limits are fixed-window MVP limits, not an edge WAF. Account
deletion is queued for operator handling because financial obligations may
remain. A production incident-response and data-processing agreement review is
still required.
