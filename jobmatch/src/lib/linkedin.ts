import crypto from "node:crypto";
import {
  LinkedInPreviewPayload,
  LinkedInExperiencePreview,
  LinkedInCertificationPreview,
} from "@/types/linkedin";

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

async function fetchLinkedInEndpoint(
  accessToken: string,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any | null> {
  const search = new URLSearchParams(params);
  const url = `${LINKEDIN_API_BASE}/${endpoint}${search.size ? `?${search.toString()}` : ""}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202404",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn("LinkedIn endpoint failed", endpoint, response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn("LinkedIn endpoint error", endpoint, error);
    return null;
  }
}

function fallbackId(seed: string): string {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 24);
}

function normalizeDate(input: any): string | null {
  if (!input) return null;
  if (typeof input === "string") {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
    return null;
  }
  if (typeof input === "object" && ("year" in input || "month" in input)) {
    const year = Number(input.year) || undefined;
    if (!year) return null;
    const month = Number(input.month) || 1;
    const day = Number(input.day) || 1;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
  }
  return null;
}

function extractId(raw: any): string {
  if (!raw) return fallbackId(Math.random().toString());
  const urn =
    typeof raw.entityUrn === "string"
      ? raw.entityUrn.split(":").pop()
      : typeof raw.urn === "string"
        ? raw.urn.split(":").pop()
        : undefined;
  if (urn) return urn;
  if (typeof raw.id === "string") return raw.id;
  if (typeof raw.$id === "string") return raw.$id;
  return fallbackId(JSON.stringify(raw));
}

function mapExperience(raw: any): LinkedInExperiencePreview | null {
  const id = extractId(raw);
  const title =
    raw.title?.localized?.en_US ||
    raw.title?.localized?.en_US ||
    raw.title?.localized?.["en_US"] ||
    raw.title?.localized?.defaultLocale ||
    raw.title?.localized ||
    raw.title?.text ||
    raw.title ||
    raw.positionTitle ||
    raw.roleTitle;
  const company =
    raw.companyName?.localized?.en_US ||
    raw.companyName?.text ||
    raw.companyName ||
    raw.company?.name ||
    raw.company?.localizedName ||
    raw.organizationName?.localized?.en_US ||
    raw.organizationName ||
    raw.company || "";

  if (!title || !company) return null;

  const startDate =
    normalizeDate(raw.timePeriod?.startDate) ||
    normalizeDate(raw.startDate) ||
    null;
  const endDate =
    normalizeDate(raw.timePeriod?.endDate) ||
    normalizeDate(raw.endDate) ||
    null;

  return {
    id,
    title,
    company,
    startDate,
    endDate,
    location:
      raw.locationName?.localized?.en_US ||
      raw.locationName ||
      raw.location ||
      raw.geoLocationName ||
      null,
    employmentType: raw.employmentType || raw.employmentStatus || null,
    description: raw.description?.localized?.en_US || raw.description || null,
  };
}

function mapCertification(raw: any): LinkedInCertificationPreview | null {
  const id = extractId(raw);
  const name =
    raw.name?.localized?.en_US ||
    raw.name?.text ||
    raw.name ||
    raw.title?.localized?.en_US ||
    raw.title ||
    raw.certificateName;
  if (!name) return null;

  return {
    id,
    name,
    issuer:
      raw.authority?.localized?.en_US ||
      raw.authority?.name ||
      raw.issuer ||
      raw.organization ||
      null,
    issueDate:
      normalizeDate(raw.issueDate) ||
      normalizeDate(raw.issuedOn) ||
      normalizeDate(raw.issuedAt) ||
      null,
    expirationDate:
      normalizeDate(raw.expirationDate) || normalizeDate(raw.expiresOn) || null,
    credentialId: raw.credentialId || raw.licenseNumber || null,
    credentialUrl: raw.credentialUrl || raw.verificationUrl || null,
  };
}

async function loadExperiences(accessToken: string): Promise<LinkedInExperiencePreview[]> {
  const candidates = ["positions", "experience", "positionsV2"];
  for (const endpoint of candidates) {
    const data = await fetchLinkedInEndpoint(accessToken, endpoint, {
      q: "me",
    });
    const elements: any[] = data?.elements || data?.values || [];
    if (Array.isArray(elements) && elements.length) {
      return elements
        .map(mapExperience)
        .filter((item): item is LinkedInExperiencePreview => Boolean(item));
    }
  }
  return [];
}

async function loadCertifications(accessToken: string): Promise<LinkedInCertificationPreview[]> {
  const candidates = ["certifications", "licensesAndCertifications"];
  for (const endpoint of candidates) {
    const data = await fetchLinkedInEndpoint(accessToken, endpoint, {
      q: "me",
    });
    const elements: any[] = data?.elements || data?.values || [];
    if (Array.isArray(elements) && elements.length) {
      return elements
        .map(mapCertification)
        .filter((item): item is LinkedInCertificationPreview => Boolean(item));
    }
  }
  return [];
}

export async function fetchLinkedInPreview(accessToken: string): Promise<LinkedInPreviewPayload> {
  const [experiences, certifications] = await Promise.all([
    loadExperiences(accessToken),
    loadCertifications(accessToken),
  ]);

  return {
    experiences,
    certifications,
  };
}
