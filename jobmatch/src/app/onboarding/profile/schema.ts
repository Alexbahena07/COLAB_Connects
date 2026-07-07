import { z } from "zod";

export const FormSchema = z.object({
  profile: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      headline: z.string().optional(),
      desiredLocation: z.string().optional(),
    })
    .optional(),

  degrees: z
    .array(
      z
        .object({
          school: z.string().optional(),
          degree: z.string().optional(),
          field: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .superRefine((val, ctx) => {
          if (val.startDate && val.endDate && new Date(val.startDate) > new Date(val.endDate)) {
            ctx.addIssue({ code: "custom", message: "Start must be before end", path: ["endDate"] });
          }
        })
    )
    .optional(),

  certificates: z
    .array(
      z.object({
        name: z.string().optional(),
        issuer: z.string().optional(),
        issuedAt: z.string().optional(),
        credentialId: z.string().optional(),
        credentialUrl: z.string().optional(),
      })
    )
    .optional(),

  experiences: z
    .array(
      z
        .object({
          title: z.string().optional(),
          company: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          description: z.string().optional(),
        })
        .superRefine((val, ctx) => {
          if (val.startDate && val.endDate && new Date(val.startDate) > new Date(val.endDate)) {
            ctx.addIssue({ code: "custom", message: "Start must be before end", path: ["endDate"] });
          }
        })
    )
    .optional(),

  skills: z
    .array(
      z.object({
        name: z.string().optional(),
        years: z.coerce.number().int().min(0).max(50).optional(),
      })
    )
    .optional(),
});

export type FormData = z.infer<typeof FormSchema>;

export const DEFAULT_VALUES: FormData = {
  profile: { firstName: "", lastName: "", headline: "", desiredLocation: "" },
  degrees: [],
  certificates: [],
  experiences: [],
  skills: [],
};

export type ResumeMetadata = {
  fileName: string;
  fileType?: string | null;
} | null;

export type ProfileResponse = {
  profile?: Partial<NonNullable<FormData["profile"]>>;
  degrees?: Array<{
    school?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certificates?: Array<{
    name?: string;
    issuer?: string;
    issuedAt?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  experiences?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills?: Array<{ name?: string; years?: number | null }>;
  resume?: { fileName?: string; fileType?: string | null } | null;
  avatarUrl?: string | null;
};
