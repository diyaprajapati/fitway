import { requireGymSession } from "@/lib/api/session";
import { jsonError, jsonOk } from "@/lib/api/json";
import { computePaymentSummaryForMembership } from "@/lib/services/membership-payment-summary";
import { getMembership } from "@/lib/services/memberships";
import { membershipToJson, paymentToJson, planToJson } from "@/lib/api/mappers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const m = await getMembership(auth.session.gymId, id);
  if (!m) return jsonError("Not found", 404);

  const paymentSummary = await computePaymentSummaryForMembership(m.id, m.amountDue, m.plan.price);

  const now = new Date();
  return jsonOk({
    ...membershipToJson(m, now),
    amountDue: m.amountDue?.toString() ?? m.plan.price.toString(),
    paymentSummary,
    plan: planToJson(m.plan),
    member: {
      id: m.member.id,
      gymId: m.member.gymId,
      name: m.member.name,
      phone: m.member.phone,
      email: m.member.email,
      notes: m.member.notes,
      createdAt: m.member.createdAt.toISOString(),
      updatedAt: m.member.updatedAt.toISOString(),
    },
    payments: m.payments.map(paymentToJson),
  });
}
