// Narrow shape for "applicant with profile" based on what we actually use
export type ApplicantWithProfile = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  profile: {
    firstName: string | null;
    lastName: string | null;
    headline: string | null;
    desiredLocation: string | null;
    resumeFileName: string | null;
    resumeFileType: string | null;
    openToWork: boolean;
  } | null;
  degrees: Array<{
    id: string;
    school: string | null;
    degree: string | null;
    field: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }>;
  certificates: Array<{
    id: string;
    name: string | null;
    issuer: string | null;
    issuedAt: Date | null;
    expirationDate: Date | null;
    credentialId: string | null;
    credentialUrl: string | null;
  }>;
  experiences: Array<{
    id: string;
    title: string | null;
    company: string | null;
    startDate: Date | null;
    endDate: Date | null;
    location: string | null;
    employmentType: string | null;
    description: string | null;
  }>;
  userSkills: Array<{
    skill: { name: string };
    years: number | null;
  }>;
};

export const applicantSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      headline: true,
      desiredLocation: true,
      resumeFileName: true,
      resumeFileType: true,
      openToWork: true,
    },
  },
  degrees: true,
  certificates: true,
  experiences: {
    orderBy: { startDate: "desc" },
  },
  userSkills: {
    include: { skill: true },
  },
} as const;

export const mapApplicant = (applicant: ApplicantWithProfile, jobId: string) => {
  const profile = applicant.profile;
  const computedName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();

  return {
    id: applicant.id,
    email: applicant.email ?? null,
    name: applicant.name ?? (computedName || "Unknown applicant"),
    photoUrl: applicant.image ?? null,
    headline: profile?.headline ?? null,
    desiredLocation: profile?.desiredLocation ?? null,
    openToWork: profile?.openToWork ?? false,
    resumeFileName: profile?.resumeFileName ?? null,
    resumeFileType: profile?.resumeFileType ?? null,
    resumeUrl: profile?.resumeFileName
      ? `/api/jobs/${jobId}/applicants/${applicant.id}/resume`
      : null,
    degrees: applicant.degrees.map((degree) => ({
      id: degree.id,
      school: degree.school,
      degree: degree.degree,
      field: degree.field,
      startDate: degree.startDate ? degree.startDate.toISOString() : null,
      endDate: degree.endDate ? degree.endDate.toISOString() : null,
    })),
    certificates: applicant.certificates.map((certificate) => ({
      id: certificate.id,
      name: certificate.name,
      issuer: certificate.issuer,
      issuedAt: certificate.issuedAt ? certificate.issuedAt.toISOString() : null,
      expirationDate: certificate.expirationDate
        ? certificate.expirationDate.toISOString()
        : null,
      credentialId: certificate.credentialId,
      credentialUrl: certificate.credentialUrl,
    })),
    experiences: applicant.experiences.map((experience) => ({
      id: experience.id,
      title: experience.title,
      company: experience.company,
      startDate: experience.startDate ? experience.startDate.toISOString() : null,
      endDate: experience.endDate ? experience.endDate.toISOString() : null,
      location: experience.location,
      employmentType: experience.employmentType,
      description: experience.description,
    })),
    skills: applicant.userSkills.map((userSkill) => ({
      name: userSkill.skill.name,
      years: userSkill.years ?? null,
    })),
  };
};
