import Stripe from "stripe";

const globalForStripe = global as unknown as { stripe?: Stripe };

// Instantiated lazily, on first use, rather than at module load. Next.js
// imports every API route during build to collect page data, and eagerly
// constructing the client here would throw at build time in any environment
// where STRIPE_SECRET_KEY isn't set, failing the build for routes that never
// even run.
const getStripe = (): Stripe => {
  if (!globalForStripe.stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set");
    globalForStripe.stripe = new Stripe(apiKey, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return globalForStripe.stripe;
};

export const stripe = new Proxy({} as Stripe, {
  get: (_target, prop, receiver) => Reflect.get(getStripe(), prop, receiver),
});
