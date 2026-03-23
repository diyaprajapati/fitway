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

/** Mutually exclusive buckets for charts: expired | expiring (7d) | active beyond 7d. */
export async function getMembershipBuckets(gymId: string) {
  const today = startOfUtcDay(new Date());
  const weekEnd = new Date(today.getTime() + 7 * 86_400_000);

  const [expired, expiringSoon, activeLater] = await Promise.all([
    prisma.membership.count({
      where: { gymId, endDate: { lt: today } },
    }),
    prisma.membership.count({
      where: {
        gymId,
        endDate: { gte: today, lte: weekEnd },
      },
    }),
    prisma.membership.count({
      where: {
        gymId,
        endDate: { gt: weekEnd },
      },
    }),
  ]);

  return { expired, expiringSoon, activeLater };
}

export type DailyRevenuePoint = {
  /** ISO date yyyy-mm-dd (UTC day) */
  date: string;
  /** Short label for axis */
  label: string;
  revenue: number;
};

/** Payments summed by UTC calendar day for the last `days` days (including today). */
export async function getDailyRevenue(gymId: string, days: number): Promise<DailyRevenuePoint[]> {
  const now = new Date();
  const endDay = startOfUtcDay(now);
  const startDay = new Date(endDay);
  startDay.setUTCDate(startDay.getUTCDate() - (days - 1));

  const payments = await prisma.payment.findMany({
    where: {
      gymId,
      paidAt: { gte: startDay },
    },
    select: { amount: true, paidAt: true },
  });

  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDay);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, 0);
  }

  for (const p of payments) {
    const key = p.paidAt.toISOString().slice(0, 10);
    if (byDay.has(key)) {
      byDay.set(key, (byDay.get(key) ?? 0) + Number(p.amount.toString()));
    }
  }

  return Array.from(byDay.entries()).map(([date, revenue]) => ({
    date,
    label: new Date(date + "T12:00:00.000Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    revenue,
  }));
}
