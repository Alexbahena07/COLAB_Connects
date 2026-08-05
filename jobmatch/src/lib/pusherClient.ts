"use client";

import PusherJS from "pusher-js";

let client: PusherJS | null = null;

// Returns null when Pusher isn't configured — callers should treat realtime as
// optional and keep working off fetches.
export const getPusherClient = (): PusherJS | null => {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  if (!client) {
    client = new PusherJS(key, {
      cluster,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
    });
  }
  return client;
};
