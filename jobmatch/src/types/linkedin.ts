export type LinkedInExperiencePreview = {
  id: string;
  title: string;
  company: string;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  employmentType?: string | null;
  description?: string | null;
};

export type LinkedInCertificationPreview = {
  id: string;
  name: string;
  issuer?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
};

export type LinkedInPreviewPayload = {
  experiences: LinkedInExperiencePreview[];
  certifications: LinkedInCertificationPreview[];
};
