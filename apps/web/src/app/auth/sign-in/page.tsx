import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { sendMagicLink } from "@/app/auth/actions";
import { isLocalSampleMode } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string; error?: string }>;
}) {
  const query = await searchParams;
  const next =
    query.next?.startsWith("/dashboard") ? query.next : "/dashboard";
  const errorMessage =
    query.error === "invalid"
      ? "Enter a valid email address."
      : query.error === "delivery"
        ? "The sign-in email could not be sent. Please try again."
        : query.error === "callback"
          ? "That sign-in link is invalid or expired. Request a fresh link."
          : null;

  return (
    <main className="auth-page">
      <section className="auth-context">
        <Logo />
        <div>
          <p className="eyebrow">Private by design</p>
          <h1>Your pattern is unpublished work. We treat it that way.</h1>
          <ul>
            <li>Private object storage</li>
            <li>Short-lived signed download links</li>
            <li>Raw files deleted after 30 days by default</li>
            <li>Never used to train models</li>
          </ul>
        </div>
        <p>Operator access is limited, purposeful and recorded.</p>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <p className="eyebrow">Welcome</p>
          <h2>Sign in to your preflights</h2>
          <p>
            Use a magic link—no password to remember. In local development, the
            sample-account button opens the complete workflow.
          </p>
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
          <form action={sendMagicLink}>
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@studio.com" required />
            <input name="next" type="hidden" value={next} />
            <button className="button button-primary" type="submit">Email me a secure link</button>
          </form>
          {isLocalSampleMode() && (
            <Link className="dev-account-link" href={next as "/dashboard"}>
              Continue with local sample account
            </Link>
          )}
          <p className="auth-legal">
            By continuing, you agree to the <Link href="/terms">terms</Link> and
            acknowledge the <Link href="/privacy">privacy notice</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
