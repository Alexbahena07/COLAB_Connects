import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

function csvField(value: string | null | undefined): string {
  let str = value ?? "";
  // Neutralize formula-triggering prefixes (CSV/formula injection) — a name or
  // headline starting with =, +, -, @, tab, or CR would otherwise be interpreted
  // as a formula by Excel/Sheets when the exported file is opened.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const applications = await prisma.eventApplication.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: {
      applicant: {
        select: {
          name: true,
          email: true,
          profile: { select: { headline: true, desiredLocation: true } },
        },
      },
    },
  });

  const header = ["Name", "Email", "Headline", "Desired Location", "Status", "Notes", "Applied At"];
  const rows = applications.map((a) => [
    csvField(a.applicant.name),
    csvField(a.applicant.email),
    csvField(a.applicant.profile?.headline ?? ""),
    csvField(a.applicant.profile?.desiredLocation ?? ""),
    csvField(a.status),
    csvField(a.notes),
    csvField(a.createdAt.toISOString()),
  ]);

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const safeTitle = event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle || "event"}-applicants.csv"`,
    },
  });
}
