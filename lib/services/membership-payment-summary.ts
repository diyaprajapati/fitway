import { prisma } from "@/lib/db";

type DecimalLike = { toString(): string };

export type PaymentSummary = {
  amountDue: string;
  paidTotal: string;
  remaining: string;
  isFullyPaid: boolean;
};

/** Compare money using integer cents to avoid float drift. */
function toCents(s: string): number {
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function decimalLikeToString(d: DecimalLike): string {
  return d.toString();
}

/** Effective amount due: snapshot on membership, else current plan price (legacy). */
export function effectiveAmountDue(
  amountDue: DecimalLike | null | undefined,
  planPrice: DecimalLike,
): string {
  if (amountDue != null) {
    return decimalLikeToString(amountDue);
  }
  return decimalLikeToString(planPrice);
}

export function buildPaymentSummary(amountDueStr: string, paidTotalStr: string): PaymentSummary {
  const dueCents = toCents(amountDueStr);
  const paidCents = toCents(paidTotalStr);
  const remainingCents = Math.max(0, dueCents - paidCents);
  return {
    amountDue: amountDueStr,
    paidTotal: paidTotalStr,
    remaining: centsToDecimalString(remainingCents),
    isFullyPaid: remainingCents === 0,
  };
}

export async function computePaymentSummaryForMembership(
  membershipId: string,
  amountDue: DecimalLike | null | undefined,
  planPrice: DecimalLike,
): Promise<PaymentSummary> {
  const dueStr = effectiveAmountDue(amountDue, planPrice);

  const agg = await prisma.payment.aggregate({
    where: { membershipId },
    _sum: { amount: true },
  });

  const paid = agg._sum.amount;
  const paidStr = paid ? decimalLikeToString(paid) : "0";

  return buildPaymentSummary(dueStr, paidStr);
}

/** One groupBy for list endpoints — avoids N+1 aggregates. */
export async function batchPaymentSummariesForMemberships(
  rows: Array<{ id: string; amountDue: DecimalLike | null | undefined; plan: { price: DecimalLike } }>,
): Promise<Map<string, PaymentSummary>> {
  const map = new Map<string, PaymentSummary>();
  if (rows.length === 0) return map;

  const ids = rows.map((r) => r.id);
  const sums = await prisma.payment.groupBy({
    by: ["membershipId"],
    where: { membershipId: { in: ids } },
    _sum: { amount: true },
  });

  const paidById = new Map<string, string>();
  for (const s of sums) {
    paidById.set(s.membershipId, s._sum.amount ? decimalLikeToString(s._sum.amount) : "0");
  }

  for (const m of rows) {
    const dueStr = effectiveAmountDue(m.amountDue, m.plan.price);
    const paidStr = paidById.get(m.id) ?? "0";
    map.set(m.id, buildPaymentSummary(dueStr, paidStr));
  }

  return map;
}

export class PaymentExceedsBalanceError extends Error {
  readonly remaining: string;
  readonly amountDue: string;
  readonly paidTotal: string;

  constructor(
    message: string,
    opts: { remaining: string; amountDue: string; paidTotal: string },
  ) {
    super(message);
    this.name = "PaymentExceedsBalanceError";
    this.remaining = opts.remaining;
    this.amountDue = opts.amountDue;
    this.paidTotal = opts.paidTotal;
  }
}

/** Ensures a new payment does not push total paid above amount due. */
export function enforcePaymentWithinBalance(
  amountDueStr: string,
  paidSoFarStr: string,
  newPaymentAmount: number,
): void {
  const dueCents = toCents(amountDueStr);
  const paidCents = toCents(paidSoFarStr);
  const newCents = toCents(String(newPaymentAmount));
  const totalAfter = paidCents + newCents;

  if (totalAfter > dueCents) {
    const remaining = Math.max(0, dueCents - paidCents);
    const remainingStr = centsToDecimalString(remaining);
    throw new PaymentExceedsBalanceError(
      `Payment exceeds remaining balance. Remaining: ${remainingStr}. Amount due: ${amountDueStr}, already paid: ${paidSoFarStr}.`,
      {
        remaining: remainingStr,
        amountDue: amountDueStr,
        paidTotal: paidSoFarStr,
      },
    );
  }
}
