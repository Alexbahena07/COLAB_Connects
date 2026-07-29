import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SponsorTier } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const TIER_RANK: Record<string, number> = { FREE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3 };

type PaidTier = "SILVER" | "GOLD" | "PLATINUM";

const paymentIntentIdOf = (value: string | Stripe.PaymentIntent | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null;

// Paying for a tier only ever upgrades a company's standing sponsorTier —
// never downgrades it, e.g. if they already hold a higher tier.
async function upgradeTierIfHigher(userId: string, tier: PaidTier) {
  const profile = await prisma.companyProfile.findUnique({
    where: { userId },
    select: { sponsorTier: true },
  });

  if (profile && TIER_RANK[tier] > TIER_RANK[profile.sponsorTier]) {
    await prisma.companyProfile.update({
      where: { userId },
      data: { sponsorTier: tier },
    });
    await prisma.notification.create({
      data: { userId, type: "SPONSOR_TIER_UPGRADED", sponsorTier: tier },
    });
  }
}

// Handles both checkout.session.completed and async_payment_succeeded: for
// delayed payment methods (e.g. bank debits) the first event arrives with
// payment_status unpaid and the second flips the sponsorship to COMPLETED.
async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  const tier = session.metadata?.tier;
  const userId = session.metadata?.userId;
  const email = session.metadata?.email ?? session.customer_details?.email;
  const companyName = session.metadata?.companyName;

  if (!tier || !userId || !email || !companyName) {
    return NextResponse.json({ error: "Missing sponsor metadata on session" }, { status: 400 });
  }

  const isPaid = session.payment_status === "paid";
  const paymentIntentId = paymentIntentIdOf(session.payment_intent);

  await prisma.sponsor.upsert({
    where: { stripeSessionId: session.id },
    create: {
      userId,
      email,
      companyName,
      tier: tier as PaidTier,
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      amountPaid: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      status: isPaid ? "COMPLETED" : "PENDING",
      paidAt: isPaid ? new Date() : null,
    },
    update: {
      stripePaymentIntentId: paymentIntentId,
      status: isPaid ? "COMPLETED" : "PENDING",
      paidAt: isPaid ? new Date() : null,
    },
  });

  if (isPaid) {
    await upgradeTierIfHigher(userId, tier as PaidTier);
  }

  return null;
}

async function findSponsorByPaymentIntent(paymentIntentId: string) {
  const direct = await prisma.sponsor.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (direct) return direct;

  // Sponsors recorded before stripePaymentIntentId existed: resolve the
  // session through Stripe, then backfill the column for next time.
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const sessionId = sessions.data[0]?.id;
  if (!sessionId) return null;

  const sponsor = await prisma.sponsor.findUnique({ where: { stripeSessionId: sessionId } });
  if (sponsor) {
    await prisma.sponsor.update({
      where: { id: sponsor.id },
      data: { stripePaymentIntentId: paymentIntentId },
    });
  }
  return sponsor;
}

// Marks a sponsorship REFUNDED/DISPUTED and, if it was the source of the
// company's current tier, downgrades to the best remaining completed
// sponsorship. A strictly higher standing tier (e.g. granted by an admin) is
// left untouched.
async function revokeSponsorship(
  sponsor: { id: string; userId: string; tier: SponsorTier },
  status: "REFUNDED" | "DISPUTED"
) {
  await prisma.sponsor.update({ where: { id: sponsor.id }, data: { status } });

  const profile = await prisma.companyProfile.findUnique({
    where: { userId: sponsor.userId },
    select: { sponsorTier: true },
  });
  if (!profile || TIER_RANK[sponsor.tier] < TIER_RANK[profile.sponsorTier]) return;

  const remaining = await prisma.sponsor.findMany({
    where: { userId: sponsor.userId, status: "COMPLETED", id: { not: sponsor.id } },
    select: { tier: true },
  });
  const best = remaining.reduce<SponsorTier>(
    (acc, s) => (TIER_RANK[s.tier] > TIER_RANK[acc] ? s.tier : acc),
    "FREE"
  );

  if (best !== profile.sponsorTier) {
    await prisma.companyProfile.update({
      where: { userId: sponsor.userId },
      data: { sponsorTier: best },
    });
  }
}

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

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const errorResponse = await handleCheckoutSession(
        event.data.object as Stripe.Checkout.Session
      );
      if (errorResponse) return errorResponse;
      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await prisma.sponsor.updateMany({
        where: { stripeSessionId: session.id },
        data: { status: "FAILED" },
      });
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      // Fires for partial refunds too; only a full refund revokes the tier.
      if (charge.amount_refunded < charge.amount) break;
      const paymentIntentId = paymentIntentIdOf(charge.payment_intent);
      if (!paymentIntentId) break;
      const sponsor = await findSponsorByPaymentIntent(paymentIntentId);
      if (sponsor) await revokeSponsorship(sponsor, "REFUNDED");
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const paymentIntentId = paymentIntentIdOf(dispute.payment_intent);
      if (!paymentIntentId) break;
      const sponsor = await findSponsorByPaymentIntent(paymentIntentId);
      if (sponsor) await revokeSponsorship(sponsor, "DISPUTED");
      break;
    }

    case "charge.dispute.closed": {
      const dispute = event.data.object as Stripe.Dispute;
      const paymentIntentId = paymentIntentIdOf(dispute.payment_intent);
      if (!paymentIntentId) break;
      const sponsor = await findSponsorByPaymentIntent(paymentIntentId);
      if (!sponsor) break;

      if (dispute.status === "won") {
        // Dispute resolved in our favor: reinstate the sponsorship and its tier.
        await prisma.sponsor.update({
          where: { id: sponsor.id },
          data: { status: "COMPLETED" },
        });
        await upgradeTierIfHigher(sponsor.userId, sponsor.tier as PaidTier);
      } else if (dispute.status === "lost") {
        // Chargeback stood: funds are gone, equivalent to a refund.
        await prisma.sponsor.update({
          where: { id: sponsor.id },
          data: { status: "REFUNDED" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
