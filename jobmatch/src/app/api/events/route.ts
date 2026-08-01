import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSponsorTier } from "@/lib/sponsorTier";
import { getRankedEventIds } from "@/lib/eventRanking";

const parseNumberParam = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

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

  // Public feed for the student job listings page: ranked by recency, a
  // boost for companies the student already follows, and a smaller boost for
  // PLATINUM over GOLD (every event here is already GOLD/PLATINUM-only, per
  // the sponsor gate in POST below) — computed in Postgres, see
  // src/lib/eventRanking.ts.
  const session = await getServerSession(authOptions);
  const page = parseNumberParam(searchParams.get("page"));
  const pageSize = parseNumberParam(searchParams.get("pageSize"));
  const take = Math.min(Math.max(pageSize ?? 50, 1), 200);
  const skip = (Math.max(page ?? 1, 1) - 1) * take;

  const rankedIds = await getRankedEventIds(session?.user?.id, { skip, take });

  if (rankedIds.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  const posts = await prisma.companyEventPost.findMany({
    where: { id: { in: rankedIds } },
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

  const postsById = new Map(posts.map((post) => [post.id, post]));
  const orderedPosts = rankedIds
    .map((id) => postsById.get(id))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));

  const payload = orderedPosts.map((post) => ({
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

  const sponsorTier = getEffectiveSponsorTier(Boolean(session.user.isAdmin), companyUser.companyProfile?.sponsorTier, companyUser.accountType);
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

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.companyEventPost.create({
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

    const followers = await tx.companyFollow.findMany({
      where: { companyId: session.user.id },
      select: { userId: true },
    });

    if (followers.length > 0) {
      await tx.notification.createMany({
        data: followers.map((f) => ({
          userId: f.userId,
          companyId: session.user.id,
          eventPostId: created.id,
          eventTitle: created.title,
          type: "NEW_EVENT",
        })),
      });
    }

    return created;
  });

  return NextResponse.json({ post }, { status: 201 });
}
