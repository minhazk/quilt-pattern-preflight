import Link from "next/link";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav aria-label="Primary navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#scope">Scope</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/demo">Sample report</Link>
        </nav>
        <Link className="button button-small button-ink" href="/auth/sign-in">
          Sign in
        </Link>
      </div>
    </header>
  );
}
