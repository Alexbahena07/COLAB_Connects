/**
 * Stripe webhook: refund, dispute, and async-payment handling. Stripe's
 * signature check and the DB are mocked; each test feeds a crafted event
 * through the handler and asserts the sponsor/tier writes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConstructEvent, mockSessionsList, mockPrisma } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockSessionsList: vi.fn(),
  mockPrisma: {
    sponsor: {
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    companyProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notification: { create: vi.fn() },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    checkout: { sessions: { list: mockSessionsList } },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { POST as webhook } from "@/app/api/webhooks/stripe/route";

const signedRequest = () =>
  new Request("http://test/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "{}",
  });

const dispatch = async (event: unknown) => {
  mockConstructEvent.mockReturnValue(event);
  return webhook(signedRequest());
};

const GOLD_SPONSOR = {
  id: "sp-1",
  userId: "company-1",
  tier: "GOLD",
  status: "COMPLETED",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("charge.refunded", () => {
  const refundEvent = (overrides: Record<string, unknown> = {}) => ({
    type: "charge.refunded",
    data: {
      object: { amount: 5000, amount_refunded: 5000, payment_intent: "pi_1", ...overrides },
    },
  });

  it("marks the sponsor REFUNDED and downgrades the tier to the best remaining sponsorship", async () => {
    mockPrisma.sponsor.findUnique.mockResolvedValue(GOLD_SPONSOR);
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ sponsorTier: "GOLD" });
    mockPrisma.sponsor.findMany.mockResolvedValue([{ tier: "SILVER" }]);

    const res = await dispatch(refundEvent());

    expect(res.status).toBe(200);
    expect(mockPrisma.sponsor.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { status: "REFUNDED" },
    });
    expect(mockPrisma.companyProfile.update).toHaveBeenCalledWith({
      where: { userId: "company-1" },
      data: { sponsorTier: "SILVER" },
    });
  });

  it("downgrades to FREE when no completed sponsorships remain", async () => {
    mockPrisma.sponsor.findUnique.mockResolvedValue(GOLD_SPONSOR);
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ sponsorTier: "GOLD" });
    mockPrisma.sponsor.findMany.mockResolvedValue([]);

    await dispatch(refundEvent());

    expect(mockPrisma.companyProfile.update).toHaveBeenCalledWith({
      where: { userId: "company-1" },
      data: { sponsorTier: "FREE" },
    });
  });

  it("leaves a strictly higher standing tier untouched (e.g. admin-granted)", async () => {
    mockPrisma.sponsor.findUnique.mockResolvedValue({ ...GOLD_SPONSOR, tier: "SILVER" });
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ sponsorTier: "PLATINUM" });

    await dispatch(refundEvent());

    expect(mockPrisma.sponsor.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { status: "REFUNDED" },
    });
    expect(mockPrisma.companyProfile.update).not.toHaveBeenCalled();
  });

  it("ignores partial refunds", async () => {
    await dispatch(refundEvent({ amount_refunded: 2500 }));

    expect(mockPrisma.sponsor.update).not.toHaveBeenCalled();
    expect(mockPrisma.companyProfile.update).not.toHaveBeenCalled();
  });

  it("resolves legacy sponsors via the Stripe session lookup and backfills the payment intent", async () => {
    mockPrisma.sponsor.findUnique
      .mockResolvedValueOnce(null) // by stripePaymentIntentId
      .mockResolvedValueOnce(GOLD_SPONSOR); // by stripeSessionId
    mockSessionsList.mockResolvedValue({ data: [{ id: "cs_legacy" }] });
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ sponsorTier: "GOLD" });
    mockPrisma.sponsor.findMany.mockResolvedValue([]);

    await dispatch(refundEvent());

    expect(mockSessionsList).toHaveBeenCalledWith({ payment_intent: "pi_1", limit: 1 });
    expect(mockPrisma.sponsor.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { stripePaymentIntentId: "pi_1" },
    });
    expect(mockPrisma.sponsor.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { status: "REFUNDED" },
    });
  });
});

describe("charge.dispute events", () => {
  it("marks the sponsor DISPUTED and revokes the tier on dispute.created", async () => {
    mockPrisma.sponsor.findUnique.mockResolvedValue(GOLD_SPONSOR);
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ sponsorTier: "GOLD" });
    mockPrisma.sponsor.findMany.mockResolvedValue([]);

    await dispatch({
      type: "charge.dispute.created",
      data: { object: { payment_intent: "pi_1" } },
    });

    expect(mockPrisma.sponsor.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { status: "DISPUTED" },
    });
    expect(mockPrisma.companyProfile.update).toHaveBeenCalledWith({
      where: { userId: "company-1" },
      data: { sponsorTier: "FREE" },
    });
  });

  it("reinstates the sponsorship and tier when a dispute is won", async () => {
    mockPrisma.sponsor.findUnique.mockResolvedValue({ ...GOLD_SPONSOR, status: "DISPUTED" });
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ sponsorTier: "FREE" });

    await dispatch({
      type: "charge.dispute.closed",
      data: { object: { payment_intent: "pi_1", status: "won" } },
    });

    expect(mockPrisma.sponsor.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { status: "COMPLETED" },
    });
    expect(mockPrisma.companyProfile.update).toHaveBeenCalledWith({
      where: { userId: "company-1" },
      data: { sponsorTier: "GOLD" },
    });
  });

  it("marks the sponsorship REFUNDED when a dispute is lost", async () => {
    mockPrisma.sponsor.findUnique.mockResolvedValue({ ...GOLD_SPONSOR, status: "DISPUTED" });

    await dispatch({
      type: "charge.dispute.closed",
      data: { object: { payment_intent: "pi_1", status: "lost" } },
    });

    expect(mockPrisma.sponsor.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { status: "REFUNDED" },
    });
  });
});

describe("checkout.session.async_payment_failed", () => {
  it("marks the sponsor FAILED", async () => {
    await dispatch({
      type: "checkout.session.async_payment_failed",
      data: { object: { id: "cs_1" } },
    });

    expect(mockPrisma.sponsor.updateMany).toHaveBeenCalledWith({
      where: { stripeSessionId: "cs_1" },
      data: { status: "FAILED" },
    });
  });
});

describe("checkout.session.async_payment_succeeded", () => {
  it("completes a pending sponsorship and upgrades the tier", async () => {
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ sponsorTier: "FREE" });

    await dispatch({
      type: "checkout.session.async_payment_succeeded",
      data: {
        object: {
          id: "cs_1",
          payment_status: "paid",
          payment_intent: "pi_1",
          amount_total: 5000,
          currency: "usd",
          metadata: {
            tier: "GOLD",
            userId: "company-1",
            email: "a@b.co",
            companyName: "Acme",
          },
        },
      },
    });

    expect(mockPrisma.sponsor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSessionId: "cs_1" },
        update: expect.objectContaining({ status: "COMPLETED", stripePaymentIntentId: "pi_1" }),
      })
    );
    expect(mockPrisma.companyProfile.update).toHaveBeenCalledWith({
      where: { userId: "company-1" },
      data: { sponsorTier: "GOLD" },
    });
  });
});
