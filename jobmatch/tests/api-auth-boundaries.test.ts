/**
 * Auth-boundary tests for API routes: unauthenticated and wrong-account-type
 * requests must be rejected before any data is touched. Sessions and the DB
 * are mocked; these tests exercise only the guard logic at the top of each
 * handler.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetServerSession, mockPrisma } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockPrisma: {
    user: { findUnique: vi.fn() },
    job: { findMany: vi.fn() },
  },
}));

// authOptions pulls in the Prisma adapter and bcrypt; the guards under test
// only pass it through to getServerSession, so an empty object suffices.
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { POST as createJob } from "@/app/api/jobs/route";
import { GET as listCandidates } from "@/app/api/candidates/route";
import { requireAdmin } from "@/lib/auth-guards";

const jsonRequest = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/jobs (create job)", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await createJob(jsonRequest("http://test/api/jobs", {}));

    expect(res.status).toBe(401);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects student accounts with 403", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "student-1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "student-1",
      accountType: "STUDENT",
      status: "ACTIVE",
      companyProfile: null,
    });

    const res = await createJob(jsonRequest("http://test/api/jobs", {}));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/company accounts/i);
  });

  it("rejects deactivated accounts with 403", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "company-1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "company-1",
      accountType: "COMPANY",
      status: "DEACTIVATED",
      companyProfile: { approvalStatus: "APPROVED" },
    });

    const res = await createJob(jsonRequest("http://test/api/jobs", {}));

    expect(res.status).toBe(403);
  });

  it("rejects unapproved company accounts with 403", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "company-1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "company-1",
      accountType: "COMPANY",
      status: "ACTIVE",
      companyProfile: { approvalStatus: "PENDING" },
    });

    const res = await createJob(jsonRequest("http://test/api/jobs", {}));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/pending admin approval/i);
  });
});

describe("GET /api/candidates (browse candidates)", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await listCandidates(new Request("http://test/api/candidates"));

    expect(res.status).toBe(401);
  });

  it("rejects student accounts with 403", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "student-1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "student-1",
      accountType: "STUDENT",
    });

    const res = await listCandidates(new Request("http://test/api/candidates"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/company accounts/i);
  });
});

describe("requireAdmin guard", () => {
  it("returns 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result.error?.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false, status: "ACTIVE" });

    const result = await requireAdmin();

    expect(result.error?.status).toBe(403);
  });

  it("returns 403 for admins whose account is no longer active", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "admin-1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: true, status: "BANNED" });

    const result = await requireAdmin();

    expect(result.error?.status).toBe(403);
  });

  it("passes through active admins", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "admin-1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: true, status: "ACTIVE" });

    const result = await requireAdmin();

    expect(result.error).toBeUndefined();
    expect(result.userId).toBe("admin-1");
  });
});
