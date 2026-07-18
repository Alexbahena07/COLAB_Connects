import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const TIER_AMOUNTS_CENTS: Record<"SILVER" | "GOLD" | "PLATINUM", number> = {
  SILVER: 150_000, // $1,500
  GOLD: 200_000, // $2,000
  PLATINUM: 400_000, // $4,000
};

const bodySchema = z.object({
  tier: z.enum(["SILVER", "GOLD", "PLATINUM"]),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      accountType: true,
      status: true,
      companyProfile: { select: { companyName: true } },
    },
  });

  if (!companyUser || companyUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "Your account is not active" }, { status: 403 });
  }
  if (companyUser.accountType !== "COMPANY" || !companyUser.companyProfile) {
    return NextResponse.json({ error: "Only company accounts can sponsor" }, { status: 403 });
  }
  if (!companyUser.email) {
    return NextResponse.json({ error: "Your account has no email on file" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { tier } = parsed.data;
  const amount = TIER_AMOUNTS_CENTS[tier];
  const { companyName } = companyUser.companyProfile;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: companyUser.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: `${tier} Sponsorship`,
            description: `COLAB Connects ${tier} sponsorship tier for ${companyName}`,
          },
        },
      },
    ],
    metadata: { tier, userId: companyUser.id, email: companyUser.email, companyName },
    success_url: `${appUrl}/dashboard/company/application?sponsor=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/company/application?sponsor=cancelled`,
  });

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 502 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
