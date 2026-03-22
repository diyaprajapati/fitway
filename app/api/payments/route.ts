import { iso, z } from "zod";
import { requireGymSession } from "@/lib/api/session";
import { jsonError, jsonOk } from "@/lib/api/json";
import { PaymentExceedsBalanceError } from "@/lib/services/membership-payment-summary";
import { createPayment, listPayments } from "@/lib/services/payments";
import { paymentToJson } from "@/lib/api/mappers";

export async function GET(req: Request) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const range =
    from || to
      ? {
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
        }
      : undefined;

  if (range?.from && Number.isNaN(range.from.getTime())) {
    return jsonError("Invalid from date", 400);
  }
  if (range?.to && Number.isNaN(range.to.getTime())) {
    return jsonError("Invalid to date", 400);
  }

  const rows = await listPayments(auth.session.gymId, range);
  return jsonOk(
    rows.map((p) => ({
      ...paymentToJson(p),
      membership: p.membership
        ? {
            id: p.membership.id,
            member: {
              id: p.membership.member.id,
              name: p.membership.member.name,
            },
            plan: {
              id: p.membership.plan.id,
              name: p.membership.plan.name,
            },
          }
        : null,
    })),
  );
}

const createSchema = z.object({
  membershipId: z.string().min(1),
  amount: z.number().positive(),
  paidAt: iso.datetime(),
  method: z.enum(["CASH", "CARD", "UPI", "OTHER"]),
  reference: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const paidAt = new Date(parsed.data.paidAt);

  try {
    const { payment: p, paymentSummary } = await createPayment(auth.session.gymId, {
      membershipId: parsed.data.membershipId,
      amount: parsed.data.amount,
      paidAt,
      method: parsed.data.method,
      reference: parsed.data.reference,
    });
    return jsonOk({
      ...paymentToJson(p),
      paymentSummary,
      membership: p.membership
        ? {
            id: p.membership.id,
            member: {
              id: p.membership.member.id,
              name: p.membership.member.name,
            },
            plan: {
              id: p.membership.plan.id,
              name: p.membership.plan.name,
            },
          }
        : null,
    });
  } catch (e) {
    if (e instanceof PaymentExceedsBalanceError) {
      return jsonError(e.message, 400, {
        remaining: e.remaining,
        amountDue: e.amountDue,
        paidTotal: e.paidTotal,
      });
    }
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Membership not found") {
      return jsonError(msg, 404);
    }
    throw e;
  }
}
