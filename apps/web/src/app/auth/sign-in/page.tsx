import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { authenticate } from "@/app/auth/actions";
import { isLocalSampleMode } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string; error?: string }>;
}) {
  const query = await searchParams;
  const next = query.next?.startsWith("/dashboard") ? query.next : "/dashboard";
  const errorMessage =
    query.error === "invalid"
      ? "Enter a valid email and a password of at least eight characters."
      : query.error === "signup"
        ? "That account could not be created. Try signing in if it already exists."
        : query.error === "signin"
          ? "The email or password was not recognised."
          : null;

  return (
    <main className="auth-page">
      <section className="auth-context">
        <Logo />
        <div>
          <p className="eyebrow">Private by design</p>
          <h1>Your pattern is unpublished work. We treat it that way.</h1>
          <ul>
            <li>Private row-level document storage</li>
            <li>Hard capped storage use</li>
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
            Sign in securely, or create an account for your first paid
            preflight. In local development, the sample-account button opens the
            complete workflow.
          </p>
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
          <form action={authenticate}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@studio.com"
              required
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
            <input name="next" type="hidden" value={next} />
            <div className="auth-buttons">
              <button
                className="button button-primary"
                name="mode"
                type="submit"
                value="sign-in"
              >
                Sign in
              </button>
              <button
                className="button button-secondary"
                name="mode"
                type="submit"
                value="sign-up"
              >
                Create account
              </button>
            </div>
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
