import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPusherServer, userChannel } from "@/lib/pusher";

export const dynamic = "force-dynamic";

// pusher-js calls this (form-encoded) when subscribing to a private channel.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json({ error: "Realtime not configured" }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const socketId = form?.get("socket_id");
  const channelName = form?.get("channel_name");

  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Users may only subscribe to their own channel.
  if (channelName !== userChannel(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
}
