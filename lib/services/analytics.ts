import { prisma } from "@/lib/db";

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function getDashboardStats(
  gymId: string,
  revenueRange?: { from: Date; to: Date },
) {
  const now = new Date();
  const today = startOfUtcDay(now);

  const [activeMemberships, expiringSoonMemberships, expiredMemberships, revenueAgg] =
    await Promise.all([
      prisma.membership.count({
        where: { gymId, endDate: { gte: today } },
      }),
      prisma.membership.count({
        where: {
          gymId,
          endDate: {
            gte: today,
            lte: new Date(today.getTime() + 7 * 86_400_000),
          },
        },
      }),
      prisma.membership.count({
        where: { gymId, endDate: { lt: today } },
      }),
      revenueRange
        ? prisma.payment.aggregate({
            where: {
              gymId,
              paidAt: { gte: revenueRange.from, lte: revenueRange.to },
            },
            _sum: { amount: true },
          })
        : prisma.payment.aggregate({
            where: { gymId },
            _sum: { amount: true },
          }),
    ]);

  return {
    activeMemberships,
    expiringSoonMemberships,
    expiredMemberships,
    revenueTotal: revenueAgg._sum.amount?.toString() ?? "0",
  };
}
