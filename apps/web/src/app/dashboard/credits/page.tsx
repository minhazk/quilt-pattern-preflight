import { createCheckout } from "@/app/actions/checkout";

const notices: Record<string, string> = {
  success:
    "Payment received. Your credit will appear as soon as the signed Stripe event is processed.",
  cancelled: "Checkout was cancelled and no credit was added.",
  sample:
    "The local sample account does not contact Stripe. Configure test credentials to exercise checkout.",
};

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;

  return (
    <main className="workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Pattern credits</p>
          <h1>Buy only what you need</h1>
          <p>
            Credits are allocated by a verified payment event, never by the
            browser redirect.
          </p>
        </div>
      </div>
      {checkout && notices[checkout] && (
        <section className="beta-callout" role="status">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>Checkout update</strong>
            <p>{notices[checkout]}</p>
          </div>
        </section>
      )}
      <section className="pricing-grid" aria-label="Credit packs">
        <article className="settings-card">
          <p className="eyebrow">Single pattern</p>
          <h2>£20</h2>
          <p>
            One full deterministic preflight, operator quality control and one
            revision comparison.
          </p>
          <form action={createCheckout}>
            <input name="plan" type="hidden" value="single" />
            <button className="button button-primary" type="submit">
              Buy one credit
            </button>
          </form>
        </article>
        <article className="settings-card">
          <p className="eyebrow">Studio pack</p>
          <h2>£49</h2>
          <p>
            Three credits for designers validating several release-ready
            patterns.
          </p>
          <form action={createCheckout}>
            <input name="plan" type="hidden" value="studio" />
            <button className="button button-primary" type="submit">
              Buy three credits
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
