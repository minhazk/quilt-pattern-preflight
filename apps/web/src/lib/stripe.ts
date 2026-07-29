import Stripe from "stripe";

export function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(secretKey, {
    appInfo: {
      name: "Quilt Pattern Mathematical Preflight",
      version: "0.1.0",
    },
    maxNetworkRetries: 2,
  });
}
