import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";

export async function getGymById(gymId: string) {
  return prisma.gym.findUnique({
    where: { id: gymId },
    select: {
      id: true,
      name: true,
      slug: true,
      memberFormConfig: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Minimal fields for public registration page (no auth). */
export async function getPublicGymSnapshot(gymId: string) {
  return prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, name: true, memberFormConfig: true },
  });
}

export async function updateGym(
  gymId: string,
  data: {
    name?: string;
    slug?: string | null;
    memberFormConfig?: Prisma.InputJsonValue;
  },
) {
  return prisma.gym.update({
    where: { id: gymId },
    data,
    select: {
      id: true,
      name: true,
      slug: true,
      memberFormConfig: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
