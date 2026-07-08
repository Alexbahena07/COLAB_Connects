"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  accountType: "STUDENT" | "COMPANY";
  status: "ACTIVE" | "DEACTIVATED" | "BANNED";
  isAdmin: boolean;
  flagged: boolean;
  flagNote: string | null;
  createdAt: string;
};

const STATUS_OPTIONS = ["ACTIVE", "DEACTIVATED", "BANNED"] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [accountType, setAccountType] = useState("");
  const [status, setStatus] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [flagNoteDraft, setFlagNoteDraft] = useState<Record<string, string>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [deleteTargetUser, setDeleteTargetUser] = useState<AdminUser | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (accountType) params.set("accountType", accountType);
      if (status) params.set("status", status);
      if (flaggedOnly) params.set("flagged", "true");

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [q, accountType, status, flaggedOnly]);

  useEffect(() => {
    const timeout = setTimeout(loadUsers, 250);
    return () => clearTimeout(timeout);
  }, [loadUsers]);

  const changeStatus = async (user: AdminUser, nextStatus: string) => {
    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update status");
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyUserId(null);
    }
  };

  const toggleFlag = async (user: AdminUser) => {
    setBusyUserId(user.id);
    try {
      const nextFlagged = !user.flagged;
      const res = await fetch(`/api/admin/users/${user.id}/flag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagged: nextFlagged,
          flagNote: nextFlagged ? flagNoteDraft[user.id] ?? user.flagNote ?? "" : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update flag");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update flag");
    } finally {
      setBusyUserId(null);
    }
  };

  const resetPassword = async (user: AdminUser) => {
    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset password");
      const data = await res.json();
      setTempPassword(data.tempPassword);
      setResetModalUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusyUserId(null);
    }
  };

  const openDeleteModal = (user: AdminUser) => {
    setDeleteTargetUser(user);
    setDeleteConfirmStep(1);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeleteTargetUser(null);
    setDeleteConfirmStep(1);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTargetUser) return;

    if (deleteConfirmStep === 1) {
      setDeleteConfirmStep(2);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${deleteTargetUser.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete user");
      }
      closeDeleteModal();
      await loadUsers();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted">
          Manage registered accounts — filter, deactivate/ban, reset passwords, flag suspicious activity, or
          permanently delete an account.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Search"
          placeholder="Name or email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 border-border bg-background text-foreground placeholder:text-muted"
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-type" className="text-sm font-medium text-foreground">
            Account type
          </label>
          <select
            id="filter-type"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
          >
            <option value="">All types</option>
            <option value="STUDENT">Student</option>
            <option value="COMPANY">Company</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-status" className="text-sm font-medium text-foreground">
            Status
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex h-11 items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => setFlaggedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Flagged only
          </label>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted">Loading users…</p> : null}

      {!isLoading && users.length === 0 ? (
        <p className="text-sm text-muted">No users match these filters.</p>
      ) : null}

      {users.length > 0 ? (
        <Table>
          <TableHead>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Signed up</Th>
            <Th>Flag</Th>
            <Th>Actions</Th>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <tr key={user.id}>
                <Td>
                  {user.name ?? "—"}
                  {user.isAdmin ? (
                    <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand">
                      Admin
                    </span>
                  ) : null}
                </Td>
                <Td>{user.email ?? "—"}</Td>
                <Td>{user.accountType}</Td>
                <Td>
                  <StatusBadge status={user.status} />
                </Td>
                <Td>{new Date(user.createdAt).toLocaleDateString()}</Td>
                <Td>
                  {user.flagged ? (
                    <span title={user.flagNote ?? undefined}>
                      <StatusBadge status="FLAGGED" />
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={user.status}
                      disabled={busyUserId === user.id}
                      onChange={(e) => changeStatus(user, e.target.value)}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-brand"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      className="btn-outline-brand h-9 px-3 text-xs"
                      disabled={busyUserId === user.id}
                      onClick={() => resetPassword(user)}
                    >
                      Reset password
                    </Button>
                    {!user.flagged ? (
                      <input
                        type="text"
                        placeholder="Flag note…"
                        value={flagNoteDraft[user.id] ?? ""}
                        onChange={(e) =>
                          setFlagNoteDraft((prev) => ({ ...prev, [user.id]: e.target.value }))
                        }
                        className="h-9 w-32 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-brand"
                      />
                    ) : null}
                    <Button
                      className="btn-outline-brand h-9 px-3 text-xs"
                      disabled={busyUserId === user.id}
                      onClick={() => toggleFlag(user)}
                    >
                      {user.flagged ? "Unflag" : "Flag"}
                    </Button>
                    <Button
                      className="h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                      disabled={busyUserId === user.id || user.isAdmin}
                      title={user.isAdmin ? "Admins cannot be deleted here" : undefined}
                      onClick={() => openDeleteModal(user)}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {deleteTargetUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-red-600"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>

            {deleteConfirmStep === 1 ? (
              <>
                <h3 className="text-lg font-semibold text-foreground">Delete user account</h3>
                <p className="mt-2 text-sm text-muted">
                  Delete{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTargetUser.name ?? deleteTargetUser.email ?? "this user"}
                  </span>
                  ? This permanently removes their account, profile, applications, and all related data.
                  This cannot be undone.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-red-700">Are you absolutely sure?</h3>
                <p className="mt-2 text-sm text-muted">
                  Confirm one more time to permanently delete{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTargetUser.email ?? deleteTargetUser.name}
                  </span>
                  . There is no way to recover this account after deletion.
                </p>
              </>
            )}

            {deleteError ? <p className="mt-3 text-sm text-red-600">{deleteError}</p> : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" className="btn-outline-brand h-10" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                onClick={confirmDelete}
                isLoading={isDeleting}
              >
                {deleteConfirmStep === 1 ? "Delete user" : "Yes, permanently delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {resetModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6">
            <h2 className="text-lg font-bold text-foreground">Temporary password</h2>
            <p className="mt-1 text-sm text-muted">
              Share this with {resetModalUser.email ?? resetModalUser.name} — it won&apos;t be shown again.
            </p>
            <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-center font-mono text-lg tracking-wide text-foreground">
              {tempPassword}
            </p>
            <div className="mt-5 flex justify-end">
              <Button
                className="btn-brand h-10 px-4 text-sm"
                onClick={() => {
                  setResetModalUser(null);
                  setTempPassword(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
