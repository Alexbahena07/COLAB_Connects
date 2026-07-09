import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSponsorTier } from "@/lib/sponsorTier";

const CreateEventPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  about: z.string().trim().min(1, "About is required").max(5000),
  link: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: "Link must start with http:// or https://",
    }),
  linkLabel: z.string().trim().max(60).optional(),
  imageUrl: z
    .string()
    .max(3_000_000)
    .optional()
    .refine(
      (value) =>
        !value ||
        ["data:image/jpeg", "data:image/png", "data:image/webp"].some((prefix) =>
          value.toLowerCase().startsWith(prefix)
        ),
      { message: "Image must be a JPEG, PNG, or WEBP" }
    ),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  if (scope === "mine") {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await prisma.companyEventPost.findMany({
      where: { companyId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ posts });
  }

  // Public feed for the student job listings page.
  const posts = await prisma.companyEventPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          image: true,
          companyProfile: { select: { companyName: true } },
        },
      },
    },
  });

  const payload = posts.map((post) => ({
    id: post.id,
    title: post.title,
    about: post.about,
    link: post.link,
    linkLabel: post.linkLabel,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt.toISOString(),
    companyId: post.company.id,
    companyName: post.company.companyProfile?.companyName ?? post.company.name ?? "A company",
    companyImage: post.company.image,
  }));

  return NextResponse.json({ posts: payload });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      accountType: true,
      companyProfile: { select: { sponsorTier: true } },
    },
  });
  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Only company accounts can post events" }, { status: 403 });
  }

  const sponsorTier = getEffectiveSponsorTier(Boolean(session.user.isAdmin), companyUser.companyProfile?.sponsorTier);
  if (sponsorTier !== "GOLD" && sponsorTier !== "PLATINUM") {
    return NextResponse.json(
      { error: "Posting events requires a Gold or Platinum sponsorship" },
      { status: 403 }
    );
  }

  const parsed = CreateEventPostSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { title, about, link, linkLabel, imageUrl } = parsed.data;

  const post = await prisma.companyEventPost.create({
    data: {
      companyId: session.user.id,
      title,
      about,
      link: link || null,
      // A button label only makes sense when there's a link to attach it to.
      linkLabel: link ? linkLabel || null : null,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
