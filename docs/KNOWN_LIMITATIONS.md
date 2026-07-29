# Known limitations

- This is an operator-assisted paid pilot, not autonomous production software.
- The initial migration, database lint and RLS isolation tests pass against a
  clean Postgres 17 service in CI, but could not be run locally on the build Mac
  because Docker/Podman was absent.
- Stripe account credentials were unavailable, so signed test checkout and
  replay are implemented/tested at boundaries but not exercised against the
  founder’s Stripe account.
- Supabase, Vercel and a Python host are not yet connected or deployed.
- Report-ready email is sent inline through Resend when configured and retained
  in an idempotent outbox; it does not yet have a separate retry worker.
- Account deletion is queued for an operator; project/raw deletion is immediate.
- Extraction intentionally proposes simple dimensions and quantities. The
  customer must declare canonical piece/block relationships.
- Confirmation supports multiple fabrics and pieces but intentionally one
  repeated-identical-block/grid relationship; mixed-block layouts remain
  unsupported.
- No OCR, metric patterns, curves, appliqué, templates, paper piecing, on-point
  layouts or fabric-layout optimisation.
- Fixed-window database rate limiting is an MVP control, not an edge WAF.
- No generic visual PDF diff; revision comparison is model/finding based.
- Operator refund and complimentary-credit UI is not yet implemented.
- Browser E2E covers the sample adapter; credentialed paid-flow E2E requires
  external test accounts.
