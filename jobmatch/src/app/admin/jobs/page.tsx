"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";

type AdminJob = {
  id: string;
  title: string;
  location: string;
  type: string;
  remote: boolean;
  postedAt: string;
  status: "APPROVED" | "REJECTED";
  reviewedAt: string | null;
  reviewedByName: string | null;
  companyId: string;
  companyName: string;
};

const TABS = ["", "APPROVED", "REJECTED"] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  "": "All",
  APPROVED: "Live",
  REJECTED: "Rejected",
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("");
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tab) params.set("status", tab);
      const res = await fetch(`/api/admin/jobs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load jobs");
      const data = await res.json();
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (jobId: string, status: "APPROVED" | "REJECTED") => {
    setBusyJobId(jobId);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update job status");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job status");
    } finally {
      setBusyJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
        <p className="mt-1 text-sm text-muted">
          Jobs go live immediately when posted. Reject a listing to remove it from the student feed.
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
      {isLoading ? <p className="text-sm text-muted">Loading jobs…</p> : null}
      {!isLoading && jobs.length === 0 ? <p className="text-sm text-muted">No jobs in this view.</p> : null}

      {jobs.length > 0 ? (
        <Table>
          <TableHead>
            <Th>Title</Th>
            <Th>Company</Th>
            <Th>Location</Th>
            <Th>Posted</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <Td>{job.title}</Td>
                <Td>{job.companyName}</Td>
                <Td>
                  {job.location}
                  {job.remote ? " · Remote" : ""}
                </Td>
                <Td>{new Date(job.postedAt).toLocaleDateString()}</Td>
                <Td>
                  <StatusBadge status={job.status} />
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      className="btn-outline-brand h-9 px-3 text-xs"
                      disabled={busyJobId === job.id || job.status === "APPROVED"}
                      onClick={() => setStatus(job.id, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      className="h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                      disabled={busyJobId === job.id || job.status === "REJECTED"}
                      onClick={() => setStatus(job.id, "REJECTED")}
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
