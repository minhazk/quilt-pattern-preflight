import type Stripe from "stripe";
import { z } from "zod";

export const checkoutPlanSchema = z.enum(["single", "studio"]);
export type CheckoutPlan = z.infer<typeof checkoutPlanSchema>;

export const checkoutProducts: Record<
  CheckoutPlan,
  { credits: 1 | 3; amountMinor: 2000 | 4900; label: string }
> = {
  single: {
    credits: 1,
    amountMinor: 2000,
    label: "One pattern preflight",
  },
  studio: {
    credits: 3,
    amountMinor: 4900,
    label: "Three-pattern studio pack",
  },
};

export type VerifiedCheckout = {
  ownerId: string;
  checkoutSessionId: string;
  paymentIntentId: string;
  amountMinor: number;
  creditCount: 1 | 3;
};

const uuidSchema = z.string().uuid();

export function verifyCompletedCheckout(
  session: Stripe.Checkout.Session,
): VerifiedCheckout {
  const plan = checkoutPlanSchema.parse(session.metadata?.plan);
  const product = checkoutProducts[plan];
  const ownerId = uuidSchema.parse(session.metadata?.owner_id);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (
    session.payment_status !== "paid" ||
    session.currency !== "gbp" ||
    session.amount_total !== product.amountMinor ||
    !paymentIntentId
  ) {
    throw new Error("Checkout session does not match a paid pilot product");
  }

  return {
    ownerId,
    checkoutSessionId: session.id,
    paymentIntentId,
    amountMinor: product.amountMinor,
    creditCount: product.credits,
  };
}
