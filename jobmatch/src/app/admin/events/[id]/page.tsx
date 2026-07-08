"use client";

import { use, useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";

type EventDetail = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  isVirtual: boolean;
  virtualUrl: string | null;
  eventDate: string;
  applicationOpenAt: string | null;
  applicationCloseAt: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
};

type Application = {
  id: string;
  status: "SUBMITTED" | "ACCEPTED" | "WAITLISTED" | "REJECTED";
  notes: string | null;
  createdAt: string;
  applicant: {
    id: string;
    name: string | null;
    email: string | null;
    headline: string | null;
    desiredLocation: string | null;
  };
};

type StudentResult = { id: string; name: string | null; email: string | null };

const STATUS_OPTIONS = ["SUBMITTED", "ACCEPTED", "WAITLISTED", "REJECTED"] as const;
const EVENT_STATUS_OPTIONS = ["DRAFT", "PUBLISHED", "CLOSED"] as const;

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<Partial<EventDetail> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventRes, appsRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`),
        fetch(`/api/admin/events/${eventId}/applications`),
      ]);
      if (!eventRes.ok) throw new Error("Failed to load event");
      if (!appsRes.ok) throw new Error("Failed to load applicants");
      const eventData = await eventRes.json();
      const appsData = await appsRes.json();
      setEvent(eventData.event);
      setEditForm(eventData.event);
      setApplications(appsData.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (studentQuery.trim().length < 2) {
      setStudentResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/students/search?q=${encodeURIComponent(studentQuery)}`);
        if (!res.ok) return;
        const data = await res.json();
        setStudentResults(data.students);
      } catch {
        // ignore transient search errors
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [studentQuery]);

  const saveEvent = async () => {
    if (!editForm) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          location: editForm.location || null,
          isVirtual: editForm.isVirtual,
          virtualUrl: editForm.virtualUrl || null,
          eventDate: editForm.eventDate ? new Date(editForm.eventDate).toISOString() : undefined,
          status: editForm.status,
        }),
      });
      if (!res.ok) throw new Error("Failed to save event");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  const addApplicant = async (studentId: string) => {
    setAddError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId: studentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add applicant");
      }
      setStudentQuery("");
      setStudentResults([]);
      await load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add applicant");
    }
  };

  const setApplicationStatus = async (appId: string, status: string) => {
    setBusyAppId(appId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update applicant status");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update applicant status");
    } finally {
      setBusyAppId(null);
    }
  };

  if (isLoading || !editForm) {
    return <p className="text-sm text-muted">Loading event…</p>;
  }

  if (!event) {
    return <p className="text-sm text-red-600">{error ?? "Event not found"}</p>;
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
          <StatusBadge status={event.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            value={editForm.title ?? ""}
            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Input
            label="Event date"
            type="datetime-local"
            value={editForm.eventDate ? toDatetimeLocal(editForm.eventDate) : ""}
            onChange={(e) => setEditForm((f) => ({ ...f, eventDate: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-description" className="block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="edit-description"
            rows={3}
            value={editForm.description ?? ""}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Location"
            value={editForm.location ?? ""}
            onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="edit-status" className="text-sm font-medium text-foreground">
              Status
            </label>
            <select
              id="edit-status"
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as EventDetail["status"] }))}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
            >
              {EVENT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button className="btn-brand h-10 px-4 text-sm" onClick={saveEvent} isLoading={isSaving}>
          Save changes
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">Applicants ({applications.length})</h2>
          <a
            href={`/api/admin/events/${eventId}/applications/export`}
            className="btn-outline-brand inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
          >
            Export CSV
          </a>
        </div>

        <div className="relative max-w-sm">
          <Input
            label="Add applicant"
            placeholder="Search students by name or email…"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
          />
          {addError ? <p className="mt-1 text-xs text-red-600">{addError}</p> : null}
          {studentResults.length > 0 ? (
            <ul className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-background shadow-lg">
              {studentResults.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => addApplicant(s.id)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-surface"
                  >
                    {s.name ?? "Unnamed"} <span className="text-muted">{s.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {applications.length === 0 ? (
          <p className="text-sm text-muted">No applicants yet.</p>
        ) : (
          <Table>
            <TableHead>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Headline</Th>
              <Th>Applied</Th>
              <Th>Status</Th>
            </TableHead>
            <TableBody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <Td>{app.applicant.name ?? "—"}</Td>
                  <Td>{app.applicant.email ?? "—"}</Td>
                  <Td>{app.applicant.headline ?? "—"}</Td>
                  <Td>{new Date(app.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <select
                      value={app.status}
                      disabled={busyAppId === app.id}
                      onChange={(e) => setApplicationStatus(app.id, e.target.value)}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-brand"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
