"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { checkoutPlanSchema } from "@/lib/billing";
import { requireUser } from "@/lib/auth";
import { createStripeClient } from "@/lib/stripe";

const priceEnvironmentKeys = {
  single: "STRIPE_PRICE_ONE_PATTERN",
  studio: "STRIPE_PRICE_THREE_PATTERNS",
} as const;

export async function createCheckout(formData: FormData) {
  const user = await requireUser();
  if (user.sample) {
    redirect("/dashboard/credits?checkout=sample");
  }

  const plan = checkoutPlanSchema.parse(formData.get("plan"));
  const priceId = process.env[priceEnvironmentKeys[plan]];
  if (!priceId) {
    throw new Error(`Stripe price is not configured for ${plan}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    ...(user.email ? { customer_email: user.email } : {}),
    metadata: {
      owner_id: user.id,
      plan,
    },
    payment_intent_data: {
      metadata: {
        owner_id: user.id,
        plan,
      },
    },
    success_url: `${appUrl}/dashboard/credits?checkout=success`,
    cancel_url: `${appUrl}/dashboard/credits?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout did not return a redirect URL");
  }
  redirect(session.url as Route);
}
