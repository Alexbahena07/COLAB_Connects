import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const TIER_RANK: Record<string, number> = { FREE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3 };

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Invalid signature: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const tier = session.metadata?.tier;
    const userId = session.metadata?.userId;
    const email = session.metadata?.email ?? session.customer_details?.email;
    const companyName = session.metadata?.companyName;

    if (!tier || !userId || !email || !companyName) {
      return NextResponse.json({ error: "Missing sponsor metadata on session" }, { status: 400 });
    }

    const isPaid = session.payment_status === "paid";

    await prisma.sponsor.upsert({
      where: { stripeSessionId: session.id },
      create: {
        userId,
        email,
        companyName,
        tier: tier as "SILVER" | "GOLD" | "PLATINUM",
        stripeSessionId: session.id,
        amountPaid: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        status: isPaid ? "COMPLETED" : "PENDING",
        paidAt: isPaid ? new Date() : null,
      },
      update: {
        status: isPaid ? "COMPLETED" : "PENDING",
        paidAt: isPaid ? new Date() : null,
      },
    });

    // Paying for a tier only ever upgrades a company's standing sponsorTier —
    // never downgrades it, e.g. if they already hold a higher tier.
    if (isPaid) {
      const profile = await prisma.companyProfile.findUnique({
        where: { userId },
        select: { sponsorTier: true },
      });

      if (profile && TIER_RANK[tier] > TIER_RANK[profile.sponsorTier]) {
        await prisma.companyProfile.update({
          where: { userId },
          data: { sponsorTier: tier as "SILVER" | "GOLD" | "PLATINUM" },
        });
        await prisma.notification.create({
          data: { userId, type: "SPONSOR_TIER_UPGRADED", sponsorTier: tier as "SILVER" | "GOLD" | "PLATINUM" },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
