import Link from "next/link";
import { Logo } from "./logo";

export function PolicyPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="policy-page">
      <header><div className="container"><Logo /><Link href="/">← Back to site</Link></div></header>
      <article>
        <p className="eyebrow">Plain-language pilot policy</p>
        <h1>{title}</h1>
        <p className="updated">Last updated {updated}</p>
        {children}
        <p className="policy-contact">Questions? Email <a href="mailto:privacy@quiltpatternpreflight.com">privacy@quiltpatternpreflight.com</a>.</p>
      </article>
    </main>
  );
}
