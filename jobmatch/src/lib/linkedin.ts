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
): Promise<unknown | null> {
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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const pickString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const readLocalizedString = (value: unknown): string | null => {
  const direct = pickString(value);
  if (direct) return direct;

  const record = asRecord(value);
  if (!record) return null;

  const localized = asRecord(record.localized);
  return (
    pickString(localized?.en_US) ??
    pickString(localized?.["en_US"]) ??
    pickString(localized?.defaultLocale) ??
    pickString(record.text) ??
    null
  );
};

function normalizeDate(input: unknown): string | null {
  if (!input) return null;
  if (typeof input === "string") {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
    return null;
  }
  if (typeof input === "object" && ("year" in (input as Record<string, unknown>) || "month" in (input as Record<string, unknown>))) {
    const record = input as Record<string, unknown>;
    const year = Number(record.year) || undefined;
    if (!year) return null;
    const month = Number(record.month) || 1;
    const day = Number(record.day) || 1;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
  }
  return null;
}

function extractId(raw: unknown): string {
  if (!raw) return fallbackId(Math.random().toString());
  const record = asRecord(raw);
  const urnValue =
    typeof record?.entityUrn === "string"
      ? record.entityUrn
      : typeof record?.urn === "string"
        ? record.urn
        : undefined;
  const urn = urnValue ? urnValue.split(":").pop() : undefined;
  if (urn) return urn;
  if (typeof record?.id === "string") return record.id;
  if (typeof record?.$id === "string") return record.$id;
  return fallbackId(JSON.stringify(raw));
}

function mapExperience(raw: unknown): LinkedInExperiencePreview | null {
  const record = asRecord(raw);
  if (!record) return null;

  const companyRecord = asRecord(record.company);
  const locationRecord = asRecord(record.locationName);
  const timePeriod = asRecord(record.timePeriod);

  const id = extractId(raw);
  const title =
    readLocalizedString(record.title) ??
    readLocalizedString(record.positionTitle) ??
    readLocalizedString(record.roleTitle);
  const company =
    readLocalizedString(record.companyName) ??
    readLocalizedString(companyRecord?.name) ??
    readLocalizedString(companyRecord?.localizedName) ??
    readLocalizedString(record.organizationName) ??
    readLocalizedString(record.company) ??
    "";

  if (!title || !company) return null;

  const startDate =
    normalizeDate(timePeriod?.startDate) ||
    normalizeDate(record.startDate) ||
    null;
  const endDate =
    normalizeDate(timePeriod?.endDate) ||
    normalizeDate(record.endDate) ||
    null;

  return {
    id,
    title,
    company,
    startDate,
    endDate,
    location:
      readLocalizedString(locationRecord) ??
      readLocalizedString(record.locationName) ??
      readLocalizedString(record.location) ??
      readLocalizedString(record.geoLocationName) ??
      null,
    employmentType:
      pickString(record.employmentType) ??
      pickString(record.employmentStatus) ??
      null,
    description:
      readLocalizedString(record.description) ??
      readLocalizedString(record.summary) ??
      null,
  };
}

function mapCertification(raw: unknown): LinkedInCertificationPreview | null {
  const record = asRecord(raw);
  if (!record) return null;

  const id = extractId(raw);
  const name =
    readLocalizedString(record.name) ??
    readLocalizedString(record.title) ??
    readLocalizedString(record.certificateName);
  if (!name) return null;

  return {
    id,
    name,
    issuer:
      readLocalizedString(record.authority) ??
      readLocalizedString(record.issuer) ??
      readLocalizedString(record.organization) ??
      null,
    issueDate:
      normalizeDate(record.issueDate) ||
      normalizeDate(record.issuedOn) ||
      normalizeDate(record.issuedAt) ||
      null,
    expirationDate:
      normalizeDate(record.expirationDate) || normalizeDate(record.expiresOn) || null,
    credentialId:
      pickString(record.credentialId) ?? pickString(record.licenseNumber) ?? null,
    credentialUrl:
      pickString(record.credentialUrl) ??
      pickString(record.verificationUrl) ??
      null,
  };
}

const extractElements = (data: unknown): unknown[] => {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.elements)) return record.elements;
  if (Array.isArray(record.values)) return record.values;
  return [];
};

async function loadExperiences(accessToken: string): Promise<LinkedInExperiencePreview[]> {
  const candidates = ["positions", "experience", "positionsV2"];
  for (const endpoint of candidates) {
    const data = await fetchLinkedInEndpoint(accessToken, endpoint, {
      q: "me",
    });
    const elements = extractElements(data);
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
    const elements = extractElements(data);
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
