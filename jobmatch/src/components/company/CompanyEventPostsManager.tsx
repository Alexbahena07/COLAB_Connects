"use client";

import { FormEvent, useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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

export default function CompanyEventPostsManager() {
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

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Title"
          placeholder="e.g. Join us at our Spring Recruiting Night"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="space-y-1">
          <label htmlFor="event-about" className="block text-sm font-medium text-foreground">
            About
          </label>
          <textarea
            id="event-about"
            rows={4}
            required
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Tell students what this event is about."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-foreground/60 focus:ring-2 focus:ring-foreground/15"
          />
        </div>
        <Input
          label="Link (optional)"
          type="url"
          placeholder="https://example.com/event"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        {link.trim() ? (
          <Input
            label="Button text (optional)"
            placeholder="e.g. RSVP now"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            maxLength={60}
          />
        ) : null}
        <div className="space-y-1">
          <label htmlFor="event-image-input" className="block text-sm font-medium text-foreground">
            Image (optional)
          </label>
          <input
            id="event-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="block w-full text-sm text-foreground/80 file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand"
          />
          {imageError ? <p className="text-xs text-red-600">{imageError}</p> : null}
          {imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="Event preview"
              className="mt-2 h-32 w-full max-w-xs rounded-xl border border-border object-cover"
            />
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" className="btn-brand h-10" isLoading={isSubmitting}>
            {editingId ? "Save changes" : "Post event"}
          </Button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-semibold text-muted hover:text-foreground"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="border-t border-border pt-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
          Your posted events
        </h3>
        {isLoadingPosts ? (
          <p className="mt-3 text-sm text-muted">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">
            You haven't posted any events yet. Events you post here will appear on the job listings
            page for students.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"
              >
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{post.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{post.about}</p>
                  {post.link ? (
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-semibold text-brandBlue underline underline-offset-4"
                    >
                      {post.linkLabel || post.link}
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(post)}
                    aria-label={`Edit ${post.title}`}
                    className="rounded-lg p-1.5 text-muted transition hover:bg-brand/10 hover:text-brand"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    aria-label={`Delete ${post.title}`}
                    className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
