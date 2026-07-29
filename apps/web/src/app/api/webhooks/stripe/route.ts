import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { verifyCompletedCheckout } from "@/lib/billing";
import { createStripeClient } from "@/lib/stripe";
import { createPrivilegedSql } from "@/lib/neon/sql";

export const runtime = "nodejs";

async function fulfillCheckout(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
) {
  const checkout = verifyCompletedCheckout(session);
  const sql = createPrivilegedSql();
  await sql`
    select public.fulfill_stripe_checkout(
      ${event.id},
      ${event.type},
      ${event.livemode},
      ${checkout.ownerId}::uuid,
      ${checkout.checkoutSessionId},
      ${checkout.paymentIntentId},
      ${checkout.amountMinor},
      ${checkout.creditCount}
    )
  `;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = createStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      await fulfillCheckout(
        event,
        event.data.object as Stripe.Checkout.Session,
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
