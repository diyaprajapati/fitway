import { prisma } from "@/lib/db";
import {
  enforcePaymentWithinBalance,
  effectiveAmountDue,
} from "@/lib/services/membership-payment-summary";
import type { PaymentMethodInput } from "@/lib/services/payments";

function normalizeOptionalString(v: string | null | undefined): string | undefined {
  if (v == null) return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
}

export async function listMembers(gymId: string, search?: string) {
  return prisma.member.findMany({
    where: {
      gymId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMember(gymId: string, id: string) {
  return prisma.member.findFirst({
    where: { id, gymId },
  });
}

/** Member with memberships (plan + payments) for detail screen. */
export async function getMemberDetail(gymId: string, memberId: string) {
  return prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: {
      memberships: {
        orderBy: { endDate: "desc" },
        include: {
          plan: true,
          payments: { orderBy: { paidAt: "desc" } },
        },
      },
    },
  });
}

export async function createMember(
  gymId: string,
  data: { name: string; phone?: string | null; email?: string | null; notes?: string | null },
) {
  const email = data.email == null ? undefined : normalizeOptionalString(data.email);
  const phone = data.phone == null ? undefined : normalizeOptionalString(data.phone);

  return prisma.member.create({
    data: {
      gymId,
      name: data.name.trim(),
      phone: phone ?? undefined,
      email: email ?? undefined,
      notes: normalizeOptionalString(data.notes ?? undefined) ?? undefined,
    },
  });
}

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Creates a member and their first membership in one transaction. */
export async function createMemberWithMembership(
  gymId: string,
  data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    planId: string;
    startDate: Date;
  },
) {
  const email = data.email == null ? undefined : normalizeOptionalString(data.email);
  const phone = data.phone == null ? undefined : normalizeOptionalString(data.phone);

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        gymId,
        name: data.name.trim(),
        phone: phone ?? undefined,
        email: email ?? undefined,
        notes: normalizeOptionalString(data.notes ?? undefined) ?? undefined,
      },
    });

    const plan = await tx.plan.findFirst({
      where: { id: data.planId, gymId, active: true },
    });
    if (!plan) throw new Error("Plan not found");

    const endDate = addDaysUtc(data.startDate, plan.durationDays);

    await tx.membership.create({
      data: {
        gymId,
        memberId: member.id,
        planId: plan.id,
        amountDue: plan.price,
        startDate: data.startDate,
        endDate,
      },
    });

    return member;
  });
}

/** Member + first membership, optional first payment — one atomic transaction per row. */
export async function createMemberWithMembershipAndOptionalPayment(
  gymId: string,
  data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    planId: string;
    startDate: Date;
    payment?:
      | {
          amount: number;
          paidAt: Date;
          method: PaymentMethodInput;
          reference?: string | null;
        }
      | null;
  },
) {
  const email = data.email == null ? undefined : normalizeOptionalString(data.email);
  const phone = data.phone == null ? undefined : normalizeOptionalString(data.phone);

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        gymId,
        name: data.name.trim(),
        phone: phone ?? undefined,
        email: email ?? undefined,
        notes: normalizeOptionalString(data.notes ?? undefined) ?? undefined,
      },
    });

    const plan = await tx.plan.findFirst({
      where: { id: data.planId, gymId, active: true },
    });
    if (!plan) throw new Error("Plan not found");

    const endDate = addDaysUtc(data.startDate, plan.durationDays);

    const membership = await tx.membership.create({
      data: {
        gymId,
        memberId: member.id,
        planId: plan.id,
        amountDue: plan.price,
        startDate: data.startDate,
        endDate,
      },
    });

    const pay = data.payment;
    if (pay && pay.amount > 0) {
      const dueStr = effectiveAmountDue(membership.amountDue, plan.price);
      const aggBefore = await tx.payment.aggregate({
        where: { membershipId: membership.id },
        _sum: { amount: true },
      });
      const paidStrBefore = aggBefore._sum.amount ? aggBefore._sum.amount.toString() : "0";

      enforcePaymentWithinBalance(dueStr, paidStrBefore, pay.amount);

      await tx.payment.create({
        data: {
          gymId,
          membershipId: membership.id,
          amount: pay.amount,
          paidAt: pay.paidAt,
          method: pay.method as "CASH" | "CARD" | "UPI" | "OTHER",
          reference: pay.reference ?? undefined,
        },
      });
    }

    return { member, membershipId: membership.id };
  });
}

export async function updateMember(
  gymId: string,
  id: string,
  data: { name?: string; phone?: string | null; email?: string | null; notes?: string | null },
) {
  const payload: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
  } = {};

  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.phone !== undefined) {
    if (data.phone === null) {
      payload.phone = null;
    } else {
      const p = normalizeOptionalString(data.phone);
      payload.phone = p === undefined ? null : p;
    }
  }
  if (data.email !== undefined) {
    if (data.email === null) {
      payload.email = null;
    } else {
      const e = normalizeOptionalString(data.email);
      payload.email = e === undefined ? null : e;
    }
  }
  if (data.notes !== undefined) {
    payload.notes = data.notes === null ? null : normalizeOptionalString(data.notes) ?? null;
  }

  return prisma.member.update({
    where: { id, gymId },
    data: payload,
  });
}

export async function deleteMember(gymId: string, id: string) {
  await prisma.member.delete({
    where: { id, gymId },
  });
}
