import Pusher from "pusher";

// Missing Pusher config degrades gracefully: messages still persist and the UI
// falls back to refetching, clients just don't get live pushes.
let cached: Pusher | null | undefined;

export const getPusherServer = (): Pusher | null => {
  if (cached !== undefined) return cached;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    cached = null;
    return cached;
  }

  cached = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return cached;
};

// Every user gets one private channel carrying all of their messaging events,
// so the auth route only has to check "is this your own channel" and the
// header badge updates without subscribing to every conversation.
export const userChannel = (userId: string) => `private-user-${userId}`;

export const NEW_MESSAGE_EVENT = "message:new";

export type NewMessageEvent = {
  conversationId: string;
  message: {
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
  };
};

export const triggerNewMessage = async (userIds: string[], event: NewMessageEvent) => {
  const pusher = getPusherServer();
  if (!pusher) return;
  try {
    await pusher.trigger(userIds.map(userChannel), NEW_MESSAGE_EVENT, event);
  } catch (error) {
    // Realtime delivery is best-effort; the message is already in the DB.
    console.error("Failed to trigger Pusher event", error);
  }
};
