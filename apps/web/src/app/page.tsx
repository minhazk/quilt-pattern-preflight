import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const checks = [
  ["01", "Piece quantities", "Reconcile pieces per block, block totals and cutting-table quantities."],
  ["02", "Finished dimensions", "Check declared finished and unfinished relationships with exact fractions."],
  ["03", "Strip yield", "Calculate WOF yield, required strips and transparent shortage or surplus."],
  ["04", "Fabric requirements", "Compare confirmed strip usage with stated rounded yardage."],
  ["05", "Quilt dimensions", "Rebuild simple grids, sashing and straight borders from confirmed inputs."],
  ["06", "Completeness", "Locate confirmed pieces, fabrics or blocks missing a matching instruction."],
];

const faqs = [
  ["Does this replace a technical editor?", "No. It is a narrow arithmetic and internal-consistency first pass before professional technical editing, pattern testing and your final review."],
  ["What files can I upload?", "English-language DOCX files with paragraphs and tables, or PDFs with selectable text. Scans and image-only PDFs are not supported."],
  ["Does a person see my pattern?", "During the paid beta, an authorised operator reviews the extracted values and automated findings before release. Every access and report change is logged."],
  ["Is my pattern used to train models?", "No. Uploaded documents are not used to train models. The core extraction and every arithmetic result follow deterministic code paths."],
  ["What if my pattern uses curves or appliqué?", "The report will identify the unsupported area and direct it to manual technical-editor review instead of inventing a result."],
  ["What happens after I revise the pattern?", "Each paid project includes one revised upload within 14 days. The next report separates resolved, remaining and new contradictions."],
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow"><span>Operator-reviewed beta</span> Mathematical preflight</p>
              <h1>Catch quilt-pattern maths errors <em>before customers do.</em></h1>
              <p className="lede">
                Upload a completed Word or text-based PDF pattern. Confirm the
                extracted measurements, then receive a source-linked arithmetic
                preflight reviewed during our beta quality-control process.
              </p>
              <div className="button-row">
                <Link className="button button-primary" href="/auth/sign-in?next=/dashboard/projects/new">
                  Preflight one pattern <span>£20</span>
                </Link>
                <Link className="text-link" href="/demo">
                  View a sample report <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <ul className="trust-list" aria-label="Key commitments">
                <li>Exact formulas</li>
                <li>Source-linked findings</li>
                <li>No subscription</li>
              </ul>
            </div>
            <div className="report-preview" aria-label="Sample preflight finding">
              <div className="preview-top">
                <span>Sample finding</span>
                <span className="status-dot">Operator reviewed</span>
              </div>
              <div className="preview-body">
                <span className="severity severity-critical">Critical · Piece quantity</span>
                <h2>8 background rectangles are missing</h2>
                <p>The cutting table states 32. Confirmed assembly data needs 40.</p>
                <div className="formula-card">
                  <span>Calculation</span>
                  <strong>8 per block × 5 blocks = 40</strong>
                  <div><span>Expected</span><b>40</b></div>
                  <div><span>Stated</span><b>32</b></div>
                  <div className="difference"><span>Difference</span><b>8 short</b></div>
                </div>
                <div className="source-card">
                  <span>Source · Page 3</span>
                  <p>“From Background fabric, cut (32) 2½″ × 4½″ rectangles.”</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="principle-strip">
          <div className="container">
            <p>Not a black box.</p>
            <strong>Every flag includes the source, the assumption and the maths.</strong>
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="container">
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow">A careful first pass</p>
                <h2>From manuscript to review-ready evidence.</h2>
              </div>
              <p>You remain in control of uncertain values. The confirmed model—not a parser guess—drives every check.</p>
            </div>
            <ol className="workflow-grid">
              <li><span>01</span><h3>Upload</h3><p>Add a completed DOCX or text-layer PDF. We reject scans and unsupported files clearly.</p></li>
              <li><span>02</span><h3>Confirm</h3><p>Review the extracted pieces, fabrics, dimensions, quantities and construction assumptions.</p></li>
              <li><span>03</span><h3>Preflight</h3><p>Deterministic rules run with exact fractional arithmetic and retain their version.</p></li>
              <li><span>04</span><h3>Review</h3><p>A beta operator checks every finding, then releases a source-linked report.</p></li>
            </ol>
          </div>
        </section>

        <section className="section section-tint" id="scope">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">Supported checks</p>
              <h2>Narrow enough to explain. Useful enough to save a second pass.</h2>
            </div>
            <div className="check-grid">
              {checks.map(([number, title, description]) => (
                <article key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <div className="scope-note">
              <div><strong>Designed for</strong><p>Simple block-based patterns, straight seams, rectangles, strips, repeated blocks, grids, sashing and straight borders.</p></div>
              <div><strong>Not checked</strong><p>Curves, appliqué, templates, on-point layouts, diagrams, prose quality, construction practicality or artistic judgement.</p></div>
            </div>
          </div>
        </section>

        <section className="section pricing-section" id="pricing">
          <div className="container pricing-grid">
            <div className="pricing-copy">
              <p className="eyebrow">Paid pilot pricing</p>
              <h2>Pay for a completed check. Not another subscription.</h2>
              <p>Every pattern includes automated preflight, beta quality-control review and one revised upload within 14 days.</p>
              <div className="privacy-promise"><span aria-hidden="true">◇</span><div><strong>Your unpublished work stays yours.</strong><p>Private storage, short-lived downloads, access logs and raw-file deletion after 30 days by default.</p></div></div>
            </div>
            <div className="price-cards">
              <article>
                <p>One pattern preflight</p>
                <div className="price"><span>£</span>20</div>
                <ul><li>One original document</li><li>Operator-reviewed report</li><li>One revision within 14 days</li></ul>
                <Link className="button button-primary" href="/auth/sign-in?next=/dashboard/projects/new">Start one preflight</Link>
              </article>
              <article className="featured-price">
                <span className="save-label">Save £11</span>
                <p>Three pattern credits</p>
                <div className="price"><span>£</span>49</div>
                <ul><li>Three separate projects</li><li>Operator-reviewed reports</li><li>One revision per project</li></ul>
                <Link className="button button-cream" href="/auth/sign-in?plan=three">Buy three credits</Link>
              </article>
            </div>
          </div>
        </section>

        <section className="section faq-section">
          <div className="container faq-grid">
            <div><p className="eyebrow">Questions, answered</p><h2>Trust starts with clear limits.</h2></div>
            <div className="faq-list">
              {faqs.map(([question, answer], index) => (
                <details key={question} open={index === 0}>
                  <summary>{question}<span aria-hidden="true">+</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="container">
            <p className="eyebrow">A second pair of eyes for the numbers</p>
            <h2>Know where the arithmetic needs attention <em>before handoff.</em></h2>
            <div className="button-row">
              <Link className="button button-cream" href="/auth/sign-in?next=/dashboard/projects/new">Preflight one pattern · £20</Link>
              <Link className="text-link light-link" href="/demo">Explore the sample report →</Link>
            </div>
          </div>
        </section>
        <section className="legal-disclaimer">
          <div className="container">Quilt Pattern Preflight checks internal arithmetic consistency within its supported scope. It does not replace professional technical editing, pattern testing or the designer’s final review.</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
