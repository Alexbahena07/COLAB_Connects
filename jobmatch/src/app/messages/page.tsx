"use client";

import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/ui/HeaderWithIcons";
import Footer from "@/components/ui/Footer";
import { getPusherClient } from "@/lib/pusherClient";

type ConversationSummary = {
  id: string;
  otherUser: { id: string; name: string; image: string | null };
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  lastMessageAt: string;
  unreadCount: number;
};

type MessageItem = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

type NewMessageEvent = {
  conversationId: string;
  message: { id: string; senderId: string; body: string; createdAt: string };
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function Avatar({
  name,
  image,
  size = 40,
}: {
  name: string;
  image: string | null;
  size?: number;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-brand font-semibold text-white"
    >
      {name.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function MessagesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [me, setMe] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(searchParams.get("conversation"));
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeOther, setActiveOther] = useState<ConversationSummary["otherUser"] | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  // Company → candidate compose target when no conversation exists yet.
  const composeCandidateId = searchParams.get("candidate");
  const composeCandidateName = searchParams.get("name") ?? "Candidate";

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setListError(
          typeof payload?.error === "string" ? payload.error : "We couldn't load your messages."
        );
        return;
      }
      setMe(typeof payload?.me === "string" ? payload.me : null);
      setConversations(Array.isArray(payload?.conversations) ? payload.conversations : []);
      setListError(null);
    } catch (err) {
      console.error("Failed to load conversations", err);
      setListError("We couldn't load your messages.");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const markRead = useCallback((conversationId: string) => {
    fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const openConversation = useCallback(
    async (conversationId: string) => {
      setActiveId(conversationId);
      setThreadError(null);
      setIsLoadingThread(true);
      setMessages([]);
      router.replace(`/messages?conversation=${conversationId}`, { scroll: false });
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setThreadError(
            typeof payload?.error === "string" ? payload.error : "We couldn't load this conversation."
          );
          return;
        }
        setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
        setActiveOther(payload?.otherUser ?? null);
        setMe((prev) => prev ?? (typeof payload?.me === "string" ? payload.me : null));
        markRead(conversationId);
      } catch (err) {
        console.error("Failed to load conversation", err);
        setThreadError("We couldn't load this conversation.");
      } finally {
        setIsLoadingThread(false);
      }
    },
    [markRead, router]
  );

  // Open the thread from the URL once the list is available.
  const initialOpened = useRef(false);
  useEffect(() => {
    if (initialOpened.current) return;
    const fromUrl = searchParams.get("conversation");
    if (fromUrl) {
      initialOpened.current = true;
      openConversation(fromUrl);
    }
  }, [searchParams, openConversation]);

  // If a compose target already has a thread, open it instead of a blank pane
  // (POST upserts anyway, so this only changes what the user sees).
  useEffect(() => {
    if (!composeCandidateId || activeId || isLoadingList) return;
    const existing = conversations.find((c) => c.otherUser.id === composeCandidateId);
    if (existing) openConversation(existing.id);
  }, [composeCandidateId, activeId, isLoadingList, conversations, openConversation]);

  // Realtime: one private channel per user carries every message event.
  useEffect(() => {
    if (!me) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `private-user-${me}`;
    const channel = pusher.subscribe(channelName);

    const onNewMessage = (event: NewMessageEvent) => {
      const mine = event.message.senderId === me;
      if (event.conversationId === activeIdRef.current) {
        setMessages((prev) =>
          prev.some((m) => m.id === event.message.id)
            ? prev
            : [...prev, { ...event.message, readAt: null }]
        );
        if (!mine) markRead(event.conversationId);
      }
      // Keep list previews and ordering fresh either way.
      loadConversations();
    };

    channel.bind("message:new", onNewMessage);
    return () => {
      channel.unbind("message:new", onNewMessage);
      pusher.unsubscribe(channelName);
    };
  }, [me, loadConversations, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || isSending) return;
    setIsSending(true);
    setSendError(null);
    try {
      if (activeId) {
        const response = await fetch(`/api/conversations/${activeId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: body }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setSendError(
            typeof payload?.error === "string" ? payload.error : "Message failed to send."
          );
          return;
        }
        setDraft("");
        if (payload?.message) {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]
          );
        }
        loadConversations();
      } else if (composeCandidateId) {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: composeCandidateId, message: body }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setSendError(
            typeof payload?.error === "string" ? payload.error : "Message failed to send."
          );
          return;
        }
        setDraft("");
        await loadConversations();
        if (typeof payload?.conversationId === "string") {
          openConversation(payload.conversationId);
        }
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setSendError("Message failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  const showCompose = !activeId && Boolean(composeCandidateId);
  const showThreadPane = Boolean(activeId) || showCompose;

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
          <h1 className="mb-4 text-2xl font-semibold sm:text-3xl">Messages</h1>

          <div className="flex h-[calc(100dvh-220px)] min-h-130 max-h-205 w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            {/* Conversation list */}
            <aside
              className={`flex h-full w-full shrink-0 flex-col border-black/10 md:w-88 md:border-r ${
                showThreadPane ? "hidden md:flex" : ""
              }`}
            >
              {isLoadingList ? (
                <p className="p-4 text-sm text-muted">Loading conversations…</p>
              ) : listError ? (
                <p className="p-4 text-sm text-red-600">{listError}</p>
              ) : conversations.length === 0 && !showCompose ? (
                <p className="p-4 text-sm text-muted">
                  No conversations yet. Companies can message candidates who applied to their jobs;
                  replies show up here.
                </p>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-black/5 overflow-y-auto">
                  {conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => openConversation(conversation.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-black/5 ${
                          conversation.id === activeId ? "bg-black/5" : ""
                        }`}
                      >
                        <Avatar
                          name={conversation.otherUser.name}
                          image={conversation.otherUser.image}
                          size={44}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">
                              {conversation.otherUser.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted">
                              {formatTime(conversation.lastMessageAt)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-sm ${
                                conversation.unreadCount > 0
                                  ? "font-semibold text-foreground"
                                  : "text-muted"
                              }`}
                            >
                              {conversation.lastMessage
                                ? `${
                                    conversation.lastMessage.senderId === me ? "You: " : ""
                                  }${conversation.lastMessage.body}`
                                : "No messages yet"}
                            </span>
                            {conversation.unreadCount > 0 ? (
                              <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                {conversation.unreadCount}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Thread */}
            <section
              className={`h-full min-h-0 min-w-0 flex-1 flex-col ${
                showThreadPane ? "flex" : "hidden md:flex"
              }`}
            >
              {showThreadPane ? (
                <>
                  <div className="flex shrink-0 items-center gap-3 border-b border-black/10 px-4 py-3.5 sm:px-5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(null);
                        router.replace("/messages", { scroll: false });
                      }}
                      className="rounded-lg p-1 text-muted transition hover:bg-black/5 md:hidden"
                      aria-label="Back to conversations"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                        <path d="M15 6l-6 6 6 6" />
                      </svg>
                    </button>
                    <Avatar
                      name={activeOther?.name ?? composeCandidateName}
                      image={activeOther?.image ?? null}
                      size={44}
                    />
                    <p className="truncate text-base font-semibold">
                      {activeOther?.name ?? composeCandidateName}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                    {isLoadingThread ? (
                      <p className="text-sm text-muted">Loading messages…</p>
                    ) : threadError ? (
                      <p className="text-sm text-red-600">{threadError}</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-muted">
                        {showCompose
                          ? `Start the conversation with ${composeCandidateName}.`
                          : "No messages yet."}
                      </p>
                    ) : (
                      messages.map((message) => {
                        const mine = message.senderId === me;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] whitespace-pre-wrap wrap-break-word rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-md ${
                                mine
                                  ? "rounded-br-sm bg-brand text-white"
                                  : "rounded-bl-sm bg-black/5 text-foreground"
                              }`}
                            >
                              <p>{message.body}</p>
                              <p
                                className={`mt-1 text-right text-[10px] ${
                                  mine ? "text-white/70" : "text-muted"
                                }`}
                              >
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      send();
                    }}
                    className="shrink-0 border-t border-black/10 p-3 sm:p-4"
                  >
                    {sendError ? (
                      <p className="mb-2 text-xs text-red-600">{sendError}</p>
                    ) : null}
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            send();
                          }
                        }}
                        rows={1}
                        maxLength={5000}
                        placeholder="Write a message…"
                        className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                      />
                      <button
                        type="submit"
                        disabled={isSending || !draft.trim()}
                        className="h-11 shrink-0 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition disabled:opacity-50"
                      >
                        {isSending ? "Sending…" : "Send"}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex h-full flex-1 items-center justify-center p-6">
                  <p className="text-sm text-muted">Select a conversation to start chatting.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function MessagesPage() {
  // useSearchParams requires a Suspense boundary during prerendering.
  return (
    <Suspense fallback={null}>
      <MessagesPageInner />
    </Suspense>
  );
}
