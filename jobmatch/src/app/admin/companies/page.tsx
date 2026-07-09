"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";

type SponsorTier = "FREE" | "SILVER" | "GOLD" | "PLATINUM";

type AdminCompany = {
  userId: string;
  companyName: string;
  website: string | null;
  headquarters: string | null;
  teamSize: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  sponsorTier: SponsorTier | null;
  approvedAt: string | null;
  approvedByName: string | null;
  user: { id: string; name: string | null; email: string | null; status: string; createdAt: string };
};

const TABS = ["PENDING", "APPROVED", "REJECTED", ""] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  "": "All",
};

const SPONSOR_TIERS: SponsorTier[] = ["FREE", "SILVER", "GOLD", "PLATINUM"];
const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = {
  FREE: "Free",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [tierBusyUserId, setTierBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tab) params.set("status", tab);
      const res = await fetch(`/api/admin/companies?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load companies");
      const data = await res.json();
      setCompanies(data.companies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const setApproval = async (userId: string, status: "APPROVED" | "REJECTED") => {
    setBusyUserId(userId);
    try {
      const res = await fetch(`/api/admin/companies/${userId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update approval status");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update approval status");
    } finally {
      setBusyUserId(null);
    }
  };

  const setSponsorTier = async (userId: string, sponsorTier: SponsorTier) => {
    setTierBusyUserId(userId);
    try {
      const res = await fetch(`/api/admin/companies/${userId}/sponsor-tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorTier }),
      });
      if (!res.ok) throw new Error("Failed to update sponsor tier");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update sponsor tier");
    } finally {
      setTierBusyUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Companies</h1>
        <p className="mt-1 text-sm text-muted">
          Approve or reject company accounts. Pending companies cannot post jobs.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-brand text-white" : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted">Loading companies…</p> : null}
      {!isLoading && companies.length === 0 ? (
        <p className="text-sm text-muted">No companies in this view.</p>
      ) : null}

      {companies.length > 0 ? (
        <Table>
          <TableHead>
            <Th>Company</Th>
            <Th>Contact</Th>
            <Th>Website</Th>
            <Th>Signed up</Th>
            <Th>Status</Th>
            <Th>Sponsor tier</Th>
            <Th>Actions</Th>
          </TableHead>
          <TableBody>
            {companies.map((c) => (
              <tr key={c.userId}>
                <Td>{c.companyName}</Td>
                <Td>
                  {c.user.name ?? "—"}
                  <br />
                  <span className="text-xs text-muted">{c.user.email}</span>
                </Td>
                <Td>
                  {c.website ? (
                    <a href={c.website} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                      {c.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>{new Date(c.user.createdAt).toLocaleDateString()}</Td>
                <Td>
                  <StatusBadge status={c.approvalStatus} />
                </Td>
                <Td>
                  <select
                    value={c.sponsorTier ?? "FREE"}
                    disabled={tierBusyUserId === c.userId}
                    onChange={(e) => setSponsorTier(c.userId, e.target.value as SponsorTier)}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-brand disabled:opacity-60"
                  >
                    {SPONSOR_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {SPONSOR_TIER_LABELS[tier]}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      className="btn-outline-brand h-9 px-3 text-xs"
                      disabled={busyUserId === c.userId || c.approvalStatus === "APPROVED"}
                      onClick={() => setApproval(c.userId, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      className="h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                      disabled={busyUserId === c.userId || c.approvalStatus === "REJECTED"}
                      onClick={() => setApproval(c.userId, "REJECTED")}
                    >
                      Reject
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
