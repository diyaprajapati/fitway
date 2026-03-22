import { prisma } from "@/lib/db";

export async function listPlans(gymId: string, activeOnly?: boolean) {
  return prisma.plan.findMany({
    where: {
      gymId,
      ...(activeOnly ? { active: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlan(gymId: string, id: string) {
  return prisma.plan.findFirst({
    where: { id, gymId },
  });
}

export async function createPlan(
  gymId: string,
  data: {
    name: string;
    durationDays: number;
    price: number;
    active?: boolean;
  },
) {
  return prisma.plan.create({
    data: {
      gymId,
      name: data.name,
      durationDays: data.durationDays,
      price: data.price,
      active: data.active ?? true,
    },
  });
}

export async function updatePlan(
  gymId: string,
  id: string,
  data: {
    name?: string;
    durationDays?: number;
    price?: number;
    active?: boolean;
  },
) {
  return prisma.plan.update({
    where: { id, gymId },
    data,
  });
}

export async function deletePlan(gymId: string, id: string) {
  await prisma.plan.delete({
    where: { id, gymId },
  });
}
