import Link from "next/link";
import { Logo } from "@/components/logo";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="app-nav">
        <Logo />
        <nav aria-label="Customer workspace">
          <Link href="/dashboard">Projects</Link>
          <Link href="/demo">Sample report</Link>
          <Link href="/dashboard/settings">Privacy & settings</Link>
        </nav>
        <div className="credit-chip">
          <span>Pattern credits</span>
          <strong>1</strong>
        </div>
        <Link href="/">Back to site</Link>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <span>Local sample account</span>
          <span className="avatar" aria-label="Account menu">MQ</span>
        </header>
        {children}
      </div>
    </div>
  );
}
