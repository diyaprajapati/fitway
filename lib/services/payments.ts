import { prisma } from "@/lib/db";
import {
  buildPaymentSummary,
  enforcePaymentWithinBalance,
  effectiveAmountDue,
  type PaymentSummary,
} from "@/lib/services/membership-payment-summary";

/** Matches Prisma `PaymentMethod` enum — use generated type after `prisma generate`. */
export type PaymentMethodInput = "CASH" | "CARD" | "UPI" | "OTHER";

export async function listPayments(
  gymId: string,
  range?: { from?: Date; to?: Date },
) {
  return prisma.payment.findMany({
    where: {
      gymId,
      ...(range?.from || range?.to
        ? {
            paidAt: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {}),
            },
          }
        : {}),
    },
    include: { membership: { include: { member: true, plan: true } } },
    orderBy: { paidAt: "desc" },
  });
}

export async function createPayment(
  gymId: string,
  data: {
    membershipId: string;
    amount: number;
    paidAt: Date;
    method: PaymentMethodInput;
    reference?: string | null;
  },
): Promise<{ payment: Awaited<ReturnType<typeof prisma.payment.create>>; paymentSummary: PaymentSummary }> {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findFirst({
      where: { id: data.membershipId, gymId },
      include: { plan: true },
    });
    if (!membership) throw new Error("Membership not found");

    const dueStr = effectiveAmountDue(membership.amountDue, membership.plan.price);

    const aggBefore = await tx.payment.aggregate({
      where: { membershipId: data.membershipId },
      _sum: { amount: true },
    });
    const paidStrBefore = aggBefore._sum.amount ? aggBefore._sum.amount.toString() : "0";

    enforcePaymentWithinBalance(dueStr, paidStrBefore, data.amount);

    const payment = await tx.payment.create({
      data: {
        gymId,
        membershipId: data.membershipId,
        amount: data.amount,
        paidAt: data.paidAt,
        method: data.method as "CASH" | "CARD" | "UPI" | "OTHER",
        reference: data.reference ?? undefined,
      },
      include: { membership: { include: { member: true, plan: true } } },
    });

    const aggAfter = await tx.payment.aggregate({
      where: { membershipId: data.membershipId },
      _sum: { amount: true },
    });
    const paidStrAfter = aggAfter._sum.amount ? aggAfter._sum.amount.toString() : "0";
    const paymentSummary = buildPaymentSummary(dueStr, paidStrAfter);

    return { payment, paymentSummary };
  });
}
