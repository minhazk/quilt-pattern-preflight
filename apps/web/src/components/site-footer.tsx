import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>
            A careful first pass for quilt-pattern arithmetic. Professional
            technical editing still matters.
          </p>
        </div>
        <div>
          <h2>Product</h2>
          <Link href="/demo">Sample report</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/#scope">Supported scope</Link>
        </div>
        <div>
          <h2>Trust</h2>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="mailto:hello@quiltpatternpreflight.com">Contact</a>
        </div>
      </div>
      <div className="container footer-note">
        © 2026 Quilt Pattern Preflight. No affiliation with quilt-design
        software providers.
      </div>
    </footer>
  );
}
