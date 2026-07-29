import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { verifyCompletedCheckout } from "@/lib/billing";
import { createStripeClient } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function fulfillCheckout(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
) {
  const checkout = verifyCompletedCheckout(session);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("fulfill_stripe_checkout", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_livemode: event.livemode,
    p_owner_id: checkout.ownerId,
    p_checkout_session_id: checkout.checkoutSessionId,
    p_payment_intent_id: checkout.paymentIntentId,
    p_amount_minor: checkout.amountMinor,
    p_credit_count: checkout.creditCount,
  });

  if (error) {
    throw new Error(`Credit fulfillment failed: ${error.code}`);
  }
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
