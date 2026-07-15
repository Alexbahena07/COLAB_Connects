"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  PostsFilterBar,
  PostListPanel,
  PostFormPanel,
  EditingBadge,
  FormErrorBanner,
  listCardClass,
  editButtonClass,
  deleteButtonClass,
  brandInputClass,
  brandLabelClass,
} from "@/components/company/PostsPanelShell";

type EventPost = {
  id: string;
  title: string;
  about: string;
  link: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  createdAt: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Unable to read file"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function CompanyEventPostsManager({ switcher }: { switcher?: ReactNode }) {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");
  const [link, setLink] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const res = await fetch("/api/events?scope=mine", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (res.ok && Array.isArray(body?.posts)) {
        setPosts(body.posts);
      }
    } catch (err) {
      console.error("Failed to load event posts", err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setImageDataUrl(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Image must be JPEG, PNG, or WEBP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImageError("Image must be under 3MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch (err) {
      console.error("Failed to read image", err);
      setImageError("Couldn't read that image. Try another file.");
    }
  };

  const resetForm = () => {
    setTitle("");
    setAbout("");
    setLink("");
    setLinkLabel("");
    setImageDataUrl(null);
    setImageError(null);
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (post: EventPost) => {
    setError(null);
    setEditingId(post.id);
    setTitle(post.title);
    setAbout(post.about);
    setLink(post.link ?? "");
    setLinkLabel(post.linkLabel ?? "");
    setImageDataUrl(post.imageUrl ?? null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(editingId ? `/api/events/${editingId}` : "/api/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          about,
          link: link.trim() || undefined,
          linkLabel: linkLabel.trim() || undefined,
          imageUrl: imageDataUrl || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't save that event. Try again.");
        return;
      }
      resetForm();
      await loadPosts();
    } catch (err) {
      console.error("Failed to save event post", err);
      setError("Couldn't save that event. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (editingId === id) resetForm();
    setPosts((prev) => prev.filter((post) => post.id !== id));
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        await loadPosts();
      }
    } catch (err) {
      console.error("Failed to delete event post", err);
      await loadPosts();
    }
  };

  const editingPost = editingId ? posts.find((post) => post.id === editingId) ?? null : null;

  return (
    <main className="flex flex-1 flex-col bg-background text-foreground md:min-h-0 md:overflow-hidden">
      <PostsFilterBar
        title="Manage event posts"
        subtitle="Promote recruiting nights, info sessions, and other events directly on the student listings feed."
        switcher={switcher}
      />

      {/* Main content — full-height two-pane */}
      <div className="flex flex-1 flex-col gap-4 p-4 md:min-h-0 md:flex-row md:overflow-hidden">
        {/* LEFT — event list */}
        <PostListPanel
          title="Your event posts"
          subtitle={
            isLoadingPosts
              ? "Loading..."
              : posts.length === 0
              ? "You haven't posted any events yet."
              : `${posts.length} event${posts.length === 1 ? "" : "s"} visible to students`
          }
        >
            {isLoadingPosts ? (
              <p className="text-sm text-muted">Loading event posts...</p>
            ) : posts.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-background">
                <p className="text-sm text-muted">No event posts yet. Post one using the form.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {posts.map((post) => {
                  const isActiveEdit = editingId === post.id;
                  return (
                    <li key={post.id} className={listCardClass(isActiveEdit)}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {post.imageUrl ? (
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 space-y-0.5">
                            <h3 className="truncate text-base font-semibold text-foreground">
                              {post.title}
                            </h3>
                            <p className="line-clamp-2 text-xs text-muted">{post.about}</p>
                            {post.link ? (
                              <a
                                href={post.link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block text-xs font-semibold text-brandBlue underline underline-offset-4"
                              >
                                {post.linkLabel || post.link}
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            className={editButtonClass(isActiveEdit)}
                            onClick={() => handleEdit(post)}
                          >
                            {isActiveEdit ? "Editing" : "Edit"}
                          </Button>
                          <Button
                            type="button"
                            className={deleteButtonClass}
                            onClick={() => handleDelete(post.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
        </PostListPanel>

        {/* RIGHT — post / edit form */}
        <PostFormPanel
          title={editingId ? "Edit event" : "Post a new event"}
          subtitle={
            editingId
              ? "Update details for an event students can already see."
              : "Publish an event and make it visible to students immediately."
          }
          badge={editingId && editingPost ? <EditingBadge label={editingPost.title} /> : null}
          onSubmit={handleSubmit}
        >
              {error ? <FormErrorBanner message={error} /> : null}

              <Input
                label="Title"
                placeholder="e.g. Spring Recruiting Night"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={brandInputClass}
                labelClassName={brandLabelClass}
              />

              <div className="space-y-1">
                <label htmlFor="event-about" className="block text-sm font-medium text-white/90">
                  About
                </label>
                <textarea
                  id="event-about"
                  rows={5}
                  required
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell students what this event is about."
                  className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white/60 focus:ring-2 focus:ring-white/20"
                />
              </div>

              <Input
                label="Link (optional)"
                type="url"
                placeholder="https://example.com/event"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className={brandInputClass}
                labelClassName={brandLabelClass}
              />

              {link.trim() ? (
                <Input
                  label="Button text (optional)"
                  placeholder="e.g. RSVP now"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  maxLength={60}
                  className={brandInputClass}
                  labelClassName={brandLabelClass}
                />
              ) : null}

              <div className="space-y-1">
                <label htmlFor="event-image-input" className="block text-sm font-medium text-white/90">
                  Image (optional)
                </label>
                <input
                  id="event-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-white/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
                {imageError ? <p className="text-xs text-red-300">{imageError}</p> : null}
                {imageDataUrl ? (
                  <img
                    src={imageDataUrl}
                    alt="Event preview"
                    className="mt-2 h-28 w-full max-w-xs rounded-xl border border-white/20 object-cover"
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button type="submit" className="btn-brand border border-white/30 bg-white/15 hover:bg-white/25" isLoading={isSubmitting}>
                  {editingId ? "Save changes" : "Post event"}
                </Button>
                {editingId ? (
                  <Button
                    type="button"
                    className="h-10 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/10"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
        </PostFormPanel>
      </div>
    </main>
  );
}
