import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { hasSupabaseEnvironment } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  let credits = user.sample ? 1 : 0;

  if (!user.sample && hasSupabaseEnvironment()) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("credit_balances")
      .select("balance")
      .eq("owner_id", user.id)
      .maybeSingle();
    credits = Number(data?.balance ?? 0);
  }

  const initials =
    user.email
      .split("@")[0]
      ?.split(/[._-]/)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "QP";

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <Logo />
        <nav aria-label="Customer workspace">
          <Link href="/dashboard">Projects</Link>
          <Link href="/demo">Sample report</Link>
          <Link href="/dashboard/credits">Credits</Link>
          <Link href="/dashboard/settings">Privacy & settings</Link>
        </nav>
        <div className="credit-chip">
          <span>Pattern credits</span>
          <strong>{credits}</strong>
        </div>
        <Link href="/">Back to site</Link>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <span>{user.sample ? "Local sample account" : user.email}</span>
          <span className="avatar" aria-label="Account menu">{initials}</span>
        </header>
        {children}
      </div>
    </div>
  );
}
