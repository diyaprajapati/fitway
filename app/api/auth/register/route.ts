import { hash } from "bcryptjs";
import { z } from "zod";
import { issueSessionJwt } from "@/lib/auth-token";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api/json";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  gymName: z.string().min(1).max(200),
  ownerName: z.string().max(200).optional(),
});

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || "gym";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const { email, password, gymName, ownerName } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return jsonError("Email already registered", 409);
  }

  const passwordHash = await hash(password, 12);
  let slug = slugify(gymName);
  const slugTaken = await prisma.gym.findUnique({ where: { slug } });
  if (slugTaken) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const result = await prisma.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: { name: gymName, slug },
    });
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: ownerName,
        gymId: gym.id,
      },
      select: { id: true, email: true, gymId: true, name: true, createdAt: true },
    });
    return { gym, user };
  });

  const accessToken = await issueSessionJwt({
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    gymId: result.user.gymId,
  });

  return jsonOk({
    gym: {
      id: result.gym.id,
      name: result.gym.name,
      slug: result.gym.slug,
    },
    user: result.user,
    accessToken,
    token: accessToken,
  });
}
