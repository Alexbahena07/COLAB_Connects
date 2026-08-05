import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireActiveStatus } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rateLimit";
import { triggerNewMessage } from "@/lib/pusher";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Loads the conversation only if the caller is one of its two participants.
const findConversationFor = (conversationId: string, userId: string) =>
  prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ companyId: userId }, { candidateId: userId }],
    },
    include: {
      company: {
        select: {
          id: true,
          image: true,
          name: true,
          companyProfile: { select: { companyName: true } },
        },
      },
      candidate: {
        select: {
          id: true,
          image: true,
          name: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await context.params;

  const conversation = await findConversationFor(id, userId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, body: true, createdAt: true, readAt: true },
  });

  const viewerIsCompany = conversation.companyId === userId;
  const otherName = viewerIsCompany
    ? [conversation.candidate.profile?.firstName, conversation.candidate.profile?.lastName]
        .filter(Boolean)
        .join(" ") || conversation.candidate.name || "Candidate"
    : conversation.company.companyProfile?.companyName || conversation.company.name || "Company";
  const other = viewerIsCompany ? conversation.candidate : conversation.company;

  return NextResponse.json({
    conversationId: conversation.id,
    otherUser: { id: other.id, name: otherName, image: other.image },
    me: userId,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt ? m.readAt.toISOString() : null,
    })),
  });
}

const sendSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const statusError = await requireActiveStatus(userId);
  if (statusError) return statusError;

  if (isRateLimited(`messages:${userId}`, 60)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 }
    );
  }

  const { id } = await context.params;
  const conversation = await findConversationFor(id, userId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [created] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        body: parsed.data.message,
      },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  await triggerNewMessage([conversation.companyId, conversation.candidateId], {
    conversationId: conversation.id,
    message: {
      id: created.id,
      senderId: created.senderId,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
    },
  });

  return NextResponse.json(
    {
      message: {
        id: created.id,
        senderId: created.senderId,
        body: created.body,
        createdAt: created.createdAt.toISOString(),
        readAt: null,
      },
    },
    { status: 201 }
  );
}
