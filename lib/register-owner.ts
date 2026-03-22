import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";

export type RegisterOwnerInput = {
  email: string;
  password: string;
  gymName: string;
  ownerName?: string;
};

export async function registerOwner(input: RegisterOwnerInput) {
  const normalizedEmail = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { ok: false as const, error: "Email already registered" };
  }

  const passwordHash = await hash(input.password, 12);
  let slug = slugify(input.gymName);
  const slugTaken = await prisma.gym.findUnique({ where: { slug } });
  if (slugTaken) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const result = await prisma.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: { name: input.gymName, slug },
    });
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: input.ownerName,
        gymId: gym.id,
      },
      select: { id: true, email: true, gymId: true, name: true, createdAt: true },
    });
    return { gym, user };
  });

  return { ok: true as const, ...result };
}
