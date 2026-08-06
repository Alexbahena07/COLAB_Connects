import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireActiveStatus } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rateLimit";
import { triggerNewMessage } from "@/lib/pusher";
import { candidatePoolWhere } from "@/lib/candidatePool";
import { canSearchCandidates, getEffectiveSponsorTier } from "@/lib/sponsorTier";

export const dynamic = "force-dynamic";

const conversationInclude = {
  company: {
    select: {
      id: true,
      name: true,
      image: true,
      companyProfile: { select: { companyName: true } },
    },
  },
  candidate: {
    select: {
      id: true,
      name: true,
      image: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true, senderId: true, body: true, createdAt: true },
  },
};

type ConversationWithParties = {
  id: string;
  companyId: string;
  candidateId: string;
  lastMessageAt: Date;
  company: {
    id: string;
    name: string | null;
    image: string | null;
    companyProfile: { companyName: string } | null;
  };
  candidate: {
    id: string;
    name: string | null;
    image: string | null;
    profile: { firstName: string | null; lastName: string | null } | null;
  };
  messages: { id: string; senderId: string; body: string; createdAt: Date }[];
};

const serializeConversation = (
  conversation: ConversationWithParties,
  viewerId: string,
  unreadCount: number
) => {
  const viewerIsCompany = conversation.companyId === viewerId;
  const other = viewerIsCompany ? conversation.candidate : conversation.company;
  const otherName = viewerIsCompany
    ? [conversation.candidate.profile?.firstName, conversation.candidate.profile?.lastName]
        .filter(Boolean)
        .join(" ") || conversation.candidate.name || "Candidate"
    : conversation.company.companyProfile?.companyName || conversation.company.name || "Company";

  const lastMessage = conversation.messages[0] ?? null;

  return {
    id: conversation.id,
    otherUser: { id: other.id, name: otherName, image: other.image },
    lastMessage: lastMessage
      ? {
          body: lastMessage.body,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt.toISOString(),
        }
      : null,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    unreadCount,
  };
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ companyId: userId }, { candidateId: userId }] },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: conversationInclude,
  });

  const unreadByConversation = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      readAt: null,
      NOT: { senderId: userId },
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(
    unreadByConversation.map((row) => [row.conversationId, row._count._all])
  );

  const payload = conversations.map((conversation) =>
    serializeConversation(conversation, userId, unreadMap.get(conversation.id) ?? 0)
  );
  const totalUnread = payload.reduce((sum, c) => sum + c.unreadCount, 0);

  return NextResponse.json({ conversations: payload, totalUnread, me: userId });
}

const createSchema = z.object({
  candidateId: z.string().min(1),
  message: z.string().trim().min(1).max(5000),
});

// Companies open conversations; candidates reply within existing threads.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const statusError = await requireActiveStatus(userId);
  if (statusError) return statusError;

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true, isAdmin: true, companyProfile: { select: { sponsorTier: true } } },
  });
  if (sender?.accountType !== "COMPANY") {
    return NextResponse.json(
      { error: "Only company accounts can start conversations" },
      { status: 403 }
    );
  }

  if (isRateLimited(`conversations:${userId}`, 20)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { candidateId, message } = parsed.data;

  // A company may message a candidate either because they applied to one of
  // its jobs, or — same as the applicant page — because the company has
  // candidate search access and the target is an actual pool candidate
  // (not, say, another company's user id).
  const application = await prisma.jobApplication.findFirst({
    where: { applicantId: candidateId, job: { companyId: userId } },
    select: { id: true },
  });

  if (!application) {
    const sponsorTier = getEffectiveSponsorTier(
      Boolean(sender.isAdmin),
      sender.companyProfile?.sponsorTier,
      sender.accountType
    );

    const isPoolCandidate =
      canSearchCandidates(sponsorTier) &&
      (await prisma.user.findFirst({
        where: { id: candidateId, ...candidatePoolWhere() },
        select: { id: true },
      })) !== null;

    if (!isPoolCandidate) {
      return NextResponse.json(
        {
          error:
            "You can only message candidates who applied to your jobs, or who you can find in candidate search.",
        },
        { status: 403 }
      );
    }
  }

  const conversation = await prisma.conversation.upsert({
    where: { companyId_candidateId: { companyId: userId, candidateId } },
    create: { companyId: userId, candidateId },
    update: {},
  });

  const [created] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, senderId: userId, body: message },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  await triggerNewMessage([userId, candidateId], {
    conversationId: conversation.id,
    message: {
      id: created.id,
      senderId: created.senderId,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
    },
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
