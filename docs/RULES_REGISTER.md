# Rules register

All rules are deterministic, versioned and stored with each finding. These are
internal consistency checks, not claims of universal quilting authority.

| ID                                 | Version | Formula / method                                   | Supported inputs                   | Key limitation                           |
| ---------------------------------- | ------: | -------------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| `DATA_CONSISTENCY`                 |   1.0.0 | Compare normalized confirmed values for one entity | Confirmed named entities           | Similar names are not inferred identical |
| `PIECE_COUNT_RECONCILIATION`       |   1.0.0 | per block × blocks + deliberate extras             | Repeated identical blocks          | Mapping must be confirmed                |
| `FINISHED_UNFINISHED_RELATIONSHIP` |   1.0.0 | finished + 2 × seam allowance                      | Explicit straight seams            | Invalid for trimmed/unsupported units    |
| `STRIP_YIELD`                      |   1.0.0 | floor(WOF ÷ subcut); ceil(quantity ÷ yield)        | Straight WOF subcuts               | No nesting/directional optimisation      |
| `FABRIC_REQUIREMENT`               |   1.0.0 | (strips × width + allowance) ÷ 36, round up        | Confirmed WOF strips               | No shrinkage, nap or unconfirmed waste   |
| `GRID_DIMENSIONS`                  |   1.0.0 | grid blocks + confirmed sashing + borders          | Rectangular grids                  | No on-point layouts                      |
| `COMPLETENESS`                     |   1.0.0 | used names − cutting names                         | Confirmed mappings                 | May indicate unsupported scope           |
| `UNSUPPORTED_CONSTRUCTION`         |   1.0.0 | no calculation                                     | Confirmed/suspected excluded scope | Informational/manual review only         |
| `OPERATOR_MANUAL_REVIEW`           |   1.0.0 | operator-declared source issue                     | Disclosed beta review              | Excluded from automated precision        |

Tests live in `services/preflight/tests/test_rules.py`, property tests in
`test_measurements.py`, and hand-declared corpus expectations in
`fixtures/golden`. Any new domain rule requires practitioner review, an updated
register entry, synthetic counterexamples, a version bump and known
limitations.
