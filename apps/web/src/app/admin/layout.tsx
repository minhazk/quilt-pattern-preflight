import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireOperator } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await requireOperator();

  return (
    <div className="admin-shell">
      <header>
        <Logo />
        <nav aria-label="Operator workspace">
          <Link href="/admin">Review queue</Link>
          <Link href="/dashboard">Customer workspace</Link>
        </nav>
        <span>{operator.email}</span>
      </header>
      {children}
    </div>
  );
}
