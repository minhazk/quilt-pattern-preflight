import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { verifyCompletedCheckout } from "@/lib/billing";

function session(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: "cs_test_verified",
    object: "checkout.session",
    amount_total: 2000,
    currency: "gbp",
    payment_intent: "pi_verified",
    payment_status: "paid",
    metadata: {
      owner_id: "4bbc1ee1-0b66-4b5d-8ed3-5adbfd54117b",
      plan: "single",
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("verifyCompletedCheckout", () => {
  it("maps a paid single checkout to one credit", () => {
    expect(verifyCompletedCheckout(session())).toEqual({
      ownerId: "4bbc1ee1-0b66-4b5d-8ed3-5adbfd54117b",
      checkoutSessionId: "cs_test_verified",
      paymentIntentId: "pi_verified",
      amountMinor: 2000,
      creditCount: 1,
    });
  });

  it.each([
    { currency: "usd" } as Partial<Stripe.Checkout.Session>,
    { amount_total: 4900 } as Partial<Stripe.Checkout.Session>,
    { payment_status: "unpaid" } as Partial<Stripe.Checkout.Session>,
    { payment_intent: null } as Partial<Stripe.Checkout.Session>,
  ])("rejects a mismatched checkout: %o", (override: Partial<Stripe.Checkout.Session>) => {
    expect(() => verifyCompletedCheckout(session(override))).toThrow();
  });

  it("rejects metadata that tries to grant a different product", () => {
    expect(() =>
      verifyCompletedCheckout(
        session({
          metadata: {
            owner_id: "4bbc1ee1-0b66-4b5d-8ed3-5adbfd54117b",
            plan: "studio",
          },
        }),
      ),
    ).toThrow();
  });
});
