import Link from "next/link";
import { Logo } from "@/components/logo";

export default function CheckEmailPage() {
  return (
    <main className="auth-page">
      <section className="auth-context">
        <Logo />
        <div>
          <p className="eyebrow">Secure sign-in</p>
          <h1>Your private workspace is one click away.</h1>
        </div>
        <p>Magic links are single-use and expire automatically.</p>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <p className="eyebrow">Check your inbox</p>
          <h2>We sent your secure link</h2>
          <p>
            Open the message on this device to finish signing in. You can close
            this page afterwards.
          </p>
          <Link className="button" href="/">
            Return to the site
          </Link>
        </div>
      </section>
    </main>
  );
}
