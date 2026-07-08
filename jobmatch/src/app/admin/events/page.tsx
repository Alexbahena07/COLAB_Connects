"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";

type AdminEvent = {
  id: string;
  title: string;
  eventDate: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  applicantCount: number;
};

const emptyForm = {
  title: "",
  description: "",
  location: "",
  isVirtual: false,
  virtualUrl: "",
  eventDate: "",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/events");
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim() || !form.description.trim() || !form.eventDate) {
      setFormError("Title, description, and event date are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          location: form.location.trim() || undefined,
          isVirtual: form.isVirtual,
          virtualUrl: form.virtualUrl.trim() || undefined,
          eventDate: new Date(form.eventDate).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create event");
      }
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Career Forum events</h1>
          <p className="mt-1 text-sm text-muted">Create events, manage applicant lists, and export results.</p>
        </div>
        <Button className="btn-brand h-10 px-4 text-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "New event"}
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-border bg-surface p-6"
        >
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              label="Event date"
              type="datetime-local"
              value={form.eventDate}
              onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="event-description" className="block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="event-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Optional"
            />
            <Input
              label="Virtual URL"
              value={form.virtualUrl}
              onChange={(e) => setForm((f) => ({ ...f, virtualUrl: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.isVirtual}
              onChange={(e) => setForm((f) => ({ ...f, isVirtual: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            This is a virtual event
          </label>
          <Button type="submit" className="btn-brand h-10 px-4 text-sm" isLoading={isSubmitting}>
            Create event
          </Button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted">Loading events…</p> : null}
      {!isLoading && events.length === 0 ? <p className="text-sm text-muted">No events yet.</p> : null}

      {events.length > 0 ? (
        <Table>
          <TableHead>
            <Th>Title</Th>
            <Th>Date</Th>
            <Th>Status</Th>
            <Th>Applicants</Th>
            <Th />
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <tr key={event.id}>
                <Td>{event.title}</Td>
                <Td>{new Date(event.eventDate).toLocaleString()}</Td>
                <Td>
                  <StatusBadge status={event.status} />
                </Td>
                <Td>{event.applicantCount}</Td>
                <Td>
                  <Link href={`/admin/events/${event.id}`} className="text-sm font-semibold text-brand hover:underline">
                    Manage
                  </Link>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
