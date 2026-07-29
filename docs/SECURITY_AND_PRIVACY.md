# Security and privacy

Customer manuscripts are unpublished commercial intellectual property.

## Implemented controls

- Passwordless Supabase Auth with request-scoped, refresh-safe clients
- RLS on every public table; ownership helpers for projects/documents
- Operator/admin authority from signed `app_metadata`, never profile fields
- Private Storage bucket, 15 MB limit, MIME allowlist and owner-path policies
- Extension and MIME agreement, random paths, SHA-256 metadata and text-layer
  validation
- 30-day raw-file deadline, immediate raw deletion, permanent project deletion,
  and queued account deletion
- HTTPS-dependent providers, no public raw-object URLs
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
- Set production Storage retention/lifecycle automation and monitor deletion
  jobs.
- Review operator access quarterly and remove stale roles.
- Use separate Stripe test/live and Supabase staging/production projects.
- Never place customer excerpts in support tickets.

## Known gaps before live production

The migration must be executed in the target Supabase project and advisors
reviewed. Rate limits are fixed-window MVP limits, not an edge WAF. Account
deletion is queued for operator handling because financial obligations may
remain. A production incident-response and data-processing agreement review is
still required.
