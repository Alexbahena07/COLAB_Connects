import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Marks the other party's messages in this conversation as read.
export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await context.params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ companyId: userId }, { candidateId: userId }] },
    select: { id: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const result = await prisma.message.updateMany({
    where: { conversationId: conversation.id, readAt: null, NOT: { senderId: userId } },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
