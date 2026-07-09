import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateEventPostSchema = z.object({
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await prisma.companyEventPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.companyId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own posts" }, { status: 403 });
  }

  const parsed = UpdateEventPostSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { title, about, link, linkLabel, imageUrl } = parsed.data;

  const updated = await prisma.companyEventPost.update({
    where: { id },
    data: {
      title,
      about,
      link: link || null,
      linkLabel: link ? linkLabel || null : null,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await prisma.companyEventPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.companyId !== session.user.id) {
    return NextResponse.json({ error: "You can only delete your own posts" }, { status: 403 });
  }

  await prisma.companyEventPost.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
