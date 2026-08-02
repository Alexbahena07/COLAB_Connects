import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 400;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Same CSV parser used by the import script, kept in sync so the recipient
// set matches exactly what was actually created.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const PRE_EXISTING = new Set(["tanviyakkali@gmail.com", "lm3915@nyu.edu"]);

const SUBJECT = "Your COLAB Connects account is ready — introducing our new Job Board";

const bodyFor = (firstName: string) => `Hi ${firstName},

Thank you for being part of the COLAB Connects Career Forum. Having you in the room made the event what it was, and we're excited to share the next step in what we're building together.

We've officially launched the COLAB Connects Job Board — a new platform built with the same mission as the Career Forum: connecting talented, motivated individuals like you with real opportunities in the alternative investments industry.

Because you attended and were accepted into the Career Forum, we've already pre-registered an account for you. To finalize it and start exploring roles, just:

1. Go to colabconnects.app
2. Click Log In
3. Select Forgot Password to set your own password and activate your account

Once you're in, you'll be able to build out your profile and start connecting with companies looking for exactly the kind of talent we met at the Forum.

If you choose to join, you won't just be an early user — you'll be one of the founding members of this community, helping shape it from the very beginning.

Thank you again for being part of the Career Forum. We hope you'll join us in this next chapter.

Warmly,
The COLAB Connects Team`;

const htmlFor = (firstName: string) =>
  bodyFor(firstName)
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("\n");

async function sendOne(to: string, firstName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email provider not configured");

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: SUBJECT, html: htmlFor(firstName), text: bodyFor(firstName) }),
    });
    if (response.ok) return;
    const retryable = response.status === 429 || response.status >= 500;
    const detail = await response.text();
    lastError = new Error(`Resend error (${response.status}): ${detail}`);
    if (!retryable || attempt === MAX_RETRIES) break;
    await delay(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
  }
  throw lastError ?? new Error("Resend error: unknown");
}

async function main() {
  const csvPath = path.join(__dirname, "career-forum-attendees.csv");
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const [, ...dataRows] = rows;

  const emails: string[] = [];
  for (const cols of dataRows) {
    const firstName = (cols[0] || "").trim();
    const lastName = (cols[1] || "").trim();
    const email = (cols[2] || "").trim().toLowerCase();
    if (firstName.toLowerCase() === "alex" && lastName.toLowerCase() === "bahena") continue;
    if (!email || PRE_EXISTING.has(email)) continue;
    emails.push(email);
  }

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, profile: { select: { firstName: true } } },
  });

  console.log(`Resolved ${users.length} recipients (expected ${emails.length}).`);

  const missingProfile = users.filter((u) => !u.profile?.firstName);
  if (missingProfile.length > 0) {
    console.log("Missing first name, will skip:", missingProfile.map((u) => u.email));
  }

  const recipients = users.filter((u) => u.profile?.firstName) as {
    email: string;
    profile: { firstName: string };
  }[];

  if (process.argv.includes("--preview")) {
    const sample = recipients.slice(0, 2);
    sample.forEach((r) => {
      console.log(`\n=== Preview for ${r.email} ===`);
      console.log(`Subject: ${SUBJECT}`);
      console.log(bodyFor(r.profile.firstName));
    });
    return;
  }

  const testTo = process.argv.find((a) => a.startsWith("--test="))?.split("=")[1];
  if (testTo) {
    const name = recipients[0]?.profile.firstName ?? "there";
    await sendOne(testTo, name);
    console.log(`Sent one test email to ${testTo} using name "${name}".`);
    return;
  }

  const failures: { email: string; error: string }[] = [];
  let sent = 0;
  for (const r of recipients) {
    try {
      await sendOne(r.email, r.profile.firstName);
      sent++;
      if (sent % 10 === 0) console.log(`Sent ${sent}/${recipients.length}...`);
    } catch (err) {
      failures.push({ email: r.email, error: err instanceof Error ? err.message : String(err) });
    }
    await delay(250);
  }

  console.log(`\nDone. Sent ${sent}/${recipients.length}.`);
  if (failures.length > 0) {
    console.log(`${failures.length} failed:`);
    failures.forEach((f) => console.log(`  - ${f.email}: ${f.error}`));
  }
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
