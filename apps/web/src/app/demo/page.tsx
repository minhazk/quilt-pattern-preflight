import type { Metadata } from "next";
import Link from "next/link";
import { FindingCard } from "@/components/finding-card";
import { Logo } from "@/components/logo";
import {
  sampleAssumptions,
  sampleFindings,
} from "@/data/sample-report";

export const metadata: Metadata = {
  title: "Sample source-linked report",
  description:
    "Explore a synthetic quilt-pattern preflight report with deliberately seeded arithmetic errors.",
};

export default function DemoPage() {
  return (
    <main className="report-page">
      <header className="report-nav">
        <div className="container">
          <Logo />
          <div>
            <span>Free synthetic demonstration</span>
            <a
              className="text-link"
              href="/sample-preflight-report.pdf"
              download
            >
              Download PDF
            </a>
            <Link className="button button-small button-primary" href="/auth/sign-in">
              Start a preflight
            </Link>
          </div>
        </div>
      </header>
      <section className="report-hero">
        <div className="container">
          <div>
            <p className="eyebrow">Operator-reviewed example</p>
            <h1>Meadow Lines Throw</h1>
            <p>
              Synthetic fixture · Version 1 · Processed 29 July 2026
            </p>
          </div>
          <div className="report-badge">
            <span>Demo result</span>
            <strong>3</strong>
            <p>source-linked findings</p>
          </div>
        </div>
      </section>
      <div className="container report-layout">
        <aside className="report-sidebar">
          <nav aria-label="Report sections">
            <a href="#summary">Summary</a>
            <a href="#assumptions">Assumptions</a>
            {sampleFindings.map((finding, index) => (
              <a href={`#finding-${index + 1}`} key={finding.id}>
                {index + 1}. {finding.title}
              </a>
            ))}
            <a href="#scope-limitations">Scope & limitations</a>
          </nav>
          <div className="review-stamp">
            <span aria-hidden="true">✓</span>
            <strong>Beta quality control</strong>
            <p>Automated findings checked before release.</p>
          </div>
        </aside>
        <div className="report-content">
          <section className="report-summary" id="summary">
            <div className="section-heading">
              <p className="eyebrow">Executive summary</p>
              <h2>Three areas need attention before final review.</h2>
              <p>
                This demonstration uses an original synthetic pattern with
                deliberately seeded errors. It shows the evidence format; it is
                not a customer result.
              </p>
            </div>
            <div className="severity-counts">
              <div><strong>1</strong><span>Critical</span></div>
              <div><strong>1</strong><span>Warning</span></div>
              <div><strong>0</strong><span>Review</span></div>
              <div><strong>1</strong><span>Information</span></div>
            </div>
          </section>

          <section className="assumption-panel" id="assumptions">
            <div>
              <p className="eyebrow">Confirmed inputs</p>
              <h2>Assumptions used</h2>
            </div>
            <dl>
              {sampleAssumptions.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </section>

          <div className="findings-list">
            {sampleFindings.map((finding, index) => (
              <FindingCard key={finding.id} finding={finding} index={index} />
            ))}
          </div>

          <section className="scope-limitations" id="scope-limitations">
            <p className="eyebrow">Read before relying on this report</p>
            <h2>Supported and confirmed scope</h2>
            <p>
              The demonstration checked confirmed piece totals, declared
              finished/unfinished relationships, and explicit unsupported
              construction markers. It did not assess diagrams, prose quality,
              sewing order, template geometry, artistic choices, legal issues
              or construction practicality.
            </p>
            <strong>
              Quilt Pattern Preflight does not replace professional technical
              editing, pattern testing or the designer’s final review.
            </strong>
          </section>
        </div>
      </div>
    </main>
  );
}
