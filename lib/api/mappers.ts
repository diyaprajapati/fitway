import { getExpiryStatus } from "@/lib/utils/expiry";

type DecimalLike = { toString(): string };

export function planToJson(p: {
  id: string;
  gymId: string;
  name: string;
  durationDays: number;
  price: DecimalLike;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    gymId: p.gymId,
    name: p.name,
    durationDays: p.durationDays,
    price: p.price.toString(),
    active: p.active,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function membershipToJson(
  m: {
    id: string;
    gymId: string;
    memberId: string;
    planId: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
  },
  now = new Date(),
) {
  return {
    id: m.id,
    gymId: m.gymId,
    memberId: m.memberId,
    planId: m.planId,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
    expiryStatus: getExpiryStatus(m.endDate, now),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function paymentToJson(
  p: {
    id: string;
    gymId: string;
    membershipId: string;
    amount: DecimalLike;
    paidAt: Date;
    method: string;
    reference: string | null;
    createdAt: Date;
  },
) {
  return {
    id: p.id,
    gymId: p.gymId,
    membershipId: p.membershipId,
    amount: p.amount.toString(),
    paidAt: p.paidAt.toISOString(),
    method: p.method,
    reference: p.reference,
    createdAt: p.createdAt.toISOString(),
  };
}
