import { prisma } from "@/lib/db";
import { getExpiryStatus } from "@/lib/utils/expiry";

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function createMembership(
  gymId: string,
  data: { memberId: string; planId: string; startDate: Date },
) {
  const plan = await prisma.plan.findFirst({
    where: { id: data.planId, gymId },
  });
  if (!plan) throw new Error("Plan not found");
  const member = await prisma.member.findFirst({
    where: { id: data.memberId, gymId },
  });
  if (!member) throw new Error("Member not found");

  const endDate = addDaysUtc(data.startDate, plan.durationDays);

  return prisma.membership.create({
    data: {
      gymId,
      memberId: data.memberId,
      planId: data.planId,
      amountDue: plan.price,
      startDate: data.startDate,
      endDate,
    },
    include: { plan: true, member: true },
  });
}

export async function listMemberships(
  gymId: string,
  filters?: { memberId?: string; expiryStatus?: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" },
) {
  const rows = await prisma.membership.findMany({
    where: {
      gymId,
      ...(filters?.memberId ? { memberId: filters.memberId } : {}),
    },
    include: { plan: true, member: true },
    orderBy: { endDate: "desc" },
  });

  const now = new Date();
  if (!filters?.expiryStatus) {
    return rows;
  }

  return rows.filter((m) => getExpiryStatus(m.endDate, now) === filters.expiryStatus);
}

export async function getMembership(gymId: string, id: string) {
  return prisma.membership.findFirst({
    where: { id, gymId },
    include: { plan: true, member: true, payments: true },
  });
}
