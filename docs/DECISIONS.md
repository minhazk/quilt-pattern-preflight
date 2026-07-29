# Decisions

| Date       | Decision                                           | Reason                                                       |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------ |
| 2026-07-29 | Disclose operator review as beta quality control   | Accuracy measurement and honest positioning                  |
| 2026-07-29 | Keep arithmetic in Python exact `Fraction` code    | No floating-point drift or model-generated math              |
| 2026-07-29 | Use one migration for the initial empty repository | Clean pilot bootstrap; future changes are forward migrations |
| 2026-07-29 | Authorise operators only through Auth app metadata | Customers cannot self-edit a privileged profile field        |
| 2026-07-29 | Use a credit ledger, not a mutable balance         | Auditable purchases, consumption and adjustments             |
| 2026-07-29 | Allocate credits only from signed Stripe events    | Redirects and browser state are not payment proof            |
| 2026-07-29 | Persist released result/model snapshots            | PDF and web report must reflect operator-approved content    |
| 2026-07-29 | Compare revision models/findings, not page pixels  | Recurring value is issue resolution and history              |
| 2026-07-29 | Use internal privacy-filtered analytics            | Avoid document content in third-party analytics              |
| 2026-07-29 | Keep local sample mode disabled in production      | No authentication bypass outside local development           |
