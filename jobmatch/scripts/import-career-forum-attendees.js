const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const UNDERGRAD_KEYWORDS = ["bachelor", "b.s", "b.a", "bsc", "undergrad"];
const GRAD_KEYWORDS = ["master", "m.s", "m.a", "mba", "phd", "doctor", "jd", "md"];

// Parses a CSV respecting quoted fields that contain commas (used throughout
// for skills and multi-location lists).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const titleCaseIfShouting = (value) => {
  if (!value) return value;
  if (value === value.toUpperCase() && /[A-Z]/.test(value)) {
    return value
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return value;
};

// One known mojibake artifact in the source sheet (smart-quote/hyphen
// mis-decoded to a stray "â"); safe to special-case since it's the only
// occurrence and a blanket unicode "fix" risks mangling legitimate
// international names elsewhere in the sheet.
const fixKnownMojibake = (value) => value.replace("LaâPierre", "La Pierre");

const isPlausibleUrl = (value) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (/\s/.test(trimmed)) return false;
  return /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(trimmed);
};

const parseGradDate = (value) => {
  const match = /^(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  return new Date(Date.UTC(year, month - 1, 1));
};

const isUndergrad = (degree) =>
  UNDERGRAD_KEYWORDS.some((k) => degree.toLowerCase().includes(k));
const isGrad = (degree) => GRAD_KEYWORDS.some((k) => degree.toLowerCase().includes(k));

async function main() {
  const csvPath = path.join(__dirname, "career-forum-attendees.csv");
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const [header, ...dataRows] = rows;
  console.log(`Parsed ${dataRows.length} data rows from CSV.`);
  console.log("Header:", header.join(" | "));

  const seenEmails = new Map(); // lowercased email -> row index, for in-file dedupe
  const issues = [];
  const candidates = [];

  dataRows.forEach((cols, idx) => {
    const rowNum = idx + 2; // +1 header, +1 for 1-indexing
    const [
      firstNameRaw,
      lastNameRaw,
      emailRaw,
      headline,
      skillsRaw,
      school,
      degree,
      _fieldOfStudy,
      gradDateRaw,
      desiredLocationRaw,
      openToWorkRaw,
      linkedinRaw,
    ] = cols.map((c) => (c ?? "").trim());

    const firstName = fixKnownMojibake(titleCaseIfShouting(firstNameRaw));
    const lastName = fixKnownMojibake(titleCaseIfShouting(lastNameRaw));

    if (firstName.toLowerCase() === "alex" && lastName.toLowerCase() === "bahena") {
      issues.push(`Row ${rowNum}: skipped Alex Bahena (explicitly excluded).`);
      return;
    }

    const email = emailRaw.toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push(`Row ${rowNum}: skipped "${firstName} ${lastName}" — missing/invalid email.`);
      return;
    }

    if (seenEmails.has(email)) {
      issues.push(
        `Row ${rowNum}: skipped "${firstName} ${lastName}" — duplicate email of row ${seenEmails.get(email)} (${email}).`
      );
      return;
    }
    seenEmails.set(email, rowNum);

    const skills = Array.from(
      new Set(
        skillsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    const desiredLocation =
      desiredLocationRaw && desiredLocationRaw.toLowerCase() !== "no preference"
        ? desiredLocationRaw
        : null;

    const linkedinUrl = isPlausibleUrl(linkedinRaw) ? linkedinRaw : null;
    if (linkedinRaw && !linkedinUrl) {
      issues.push(`Row ${rowNum}: dropped invalid LinkedIn value "${linkedinRaw}" for ${firstName} ${lastName}.`);
    }

    const gradDate = gradDateRaw ? parseGradDate(gradDateRaw) : null;
    if (gradDateRaw && !gradDate) {
      issues.push(`Row ${rowNum}: couldn't parse graduation date "${gradDateRaw}" for ${firstName} ${lastName}.`);
    }

    if (degree && !isUndergrad(degree) && !isGrad(degree)) {
      issues.push(
        `Row ${rowNum}: degree "${degree}" for ${firstName} ${lastName} doesn't match known undergrad/grad keywords — years-out filter won't catch it.`
      );
    }

    const openToWork = openToWorkRaw.trim().toLowerCase() !== "no";

    candidates.push({
      rowNum,
      firstName,
      lastName,
      email,
      headline: headline || null,
      skills,
      school: school || null,
      degree: degree || null,
      gradDate,
      desiredLocation,
      openToWork,
      linkedinUrl,
    });
  });

  console.log(`\n${candidates.length} candidates ready to import; ${issues.length} rows flagged:\n`);
  issues.forEach((line) => console.log(" - " + line));

  const existing = await prisma.user.findMany({
    where: { email: { in: candidates.map((c) => c.email) } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((u) => (u.email || "").toLowerCase()));

  const toCreate = candidates.filter((c) => !existingEmails.has(c.email));
  const alreadyPresent = candidates.filter((c) => existingEmails.has(c.email));

  console.log(`\n${alreadyPresent.length} already exist in the database and will be skipped:`);
  alreadyPresent.forEach((c) => console.log(`   - ${c.email}`));

  if (process.argv.includes("--dry-run")) {
    console.log(`\nDry run only — would create ${toCreate.length} new candidate accounts. No writes performed.`);
    return;
  }

  console.log(`\nCreating ${toCreate.length} new candidate accounts...\n`);

  let created = 0;
  for (const c of toCreate) {
    const skillRecords = await Promise.all(
      c.skills.map((name) =>
        prisma.skill.upsert({ where: { name }, update: {}, create: { name } })
      )
    );

    await prisma.user.create({
      data: {
        email: c.email,
        name: `${c.firstName} ${c.lastName}`.trim(),
        accountType: "STUDENT",
        status: "ACTIVE",
        // These addresses were collected directly at the Career Forum
        // check-in, not self-submitted through signup, so we treat them as
        // already verified — otherwise the "Forgot Password" activation flow
        // in the launch email dead-ends at an unadvertised second
        // verify-your-email step.
        emailVerified: new Date(),
        linkedinUrl: c.linkedinUrl,
        profile: {
          create: {
            firstName: c.firstName,
            lastName: c.lastName,
            headline: c.headline,
            desiredLocation: c.desiredLocation,
            openToWork: c.openToWork,
          },
        },
        degrees: c.school
          ? {
              create: [
                {
                  school: c.school,
                  degree: c.degree,
                  endDate: c.gradDate,
                },
              ],
            }
          : undefined,
        userSkills: {
          create: skillRecords.map((skill) => ({ skillId: skill.id })),
        },
      },
    });
    created++;
  }

  if (created > 0) {
    // Lifetime signup counter — never decremented, so it survives account
    // deletions. Keep it in sync for real bulk-imported users too.
    await prisma.appStats.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", totalUsersCreated: created },
      update: { totalUsersCreated: { increment: created } },
    });
  }

  console.log(`\nDone. Created ${created} new student accounts.`);
  console.log(`Skipped: ${issues.length} flagged rows, ${alreadyPresent.length} already-existing emails.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
