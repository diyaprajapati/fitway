import { prisma } from "@/lib/db";

export async function getGymById(gymId: string) {
  return prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
  });
}

export async function updateGym(
  gymId: string,
  data: { name?: string; slug?: string | null },
) {
  return prisma.gym.update({
    where: { id: gymId },
    data,
    select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
  });
}
