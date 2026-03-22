import { iso, z } from "zod";
import { requireGymSession } from "@/lib/api/session";
import { jsonError, jsonOk } from "@/lib/api/json";
import { batchPaymentSummariesForMemberships } from "@/lib/services/membership-payment-summary";
import { createMembership, listMemberships } from "@/lib/services/memberships";
import { membershipToJson, planToJson } from "@/lib/api/mappers";

const expiryStatusSchema = z.enum(["ACTIVE", "EXPIRING_SOON", "EXPIRED"]);

export async function GET(req: Request) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId") ?? undefined;
  const expiryRaw = searchParams.get("expiryStatus");
  const expiryParsed = expiryRaw ? expiryStatusSchema.safeParse(expiryRaw) : null;
  const expiryStatus = expiryParsed?.success ? expiryParsed.data : undefined;

  if (expiryRaw && !expiryStatus) {
    return jsonError("expiryStatus must be ACTIVE, EXPIRING_SOON, or EXPIRED", 400);
  }

  const rows = await listMemberships(auth.session.gymId, {
    memberId,
    expiryStatus,
  });

  const summaries = await batchPaymentSummariesForMemberships(
    rows.map((m) => ({
      id: m.id,
      amountDue: m.amountDue,
      plan: m.plan,
    })),
  );

  const now = new Date();
  return jsonOk(
    rows.map((m) => ({
      ...membershipToJson(m, now),
      amountDue: m.amountDue?.toString() ?? m.plan.price.toString(),
      paymentSummary: summaries.get(m.id),
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
    })),
  );
}

const createSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  startDate: iso.datetime(),
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

  const startDate = new Date(parsed.data.startDate);

  try {
    const m = await createMembership(auth.session.gymId, {
      memberId: parsed.data.memberId,
      planId: parsed.data.planId,
      startDate,
    });
    const summaries = await batchPaymentSummariesForMemberships([
      { id: m.id, amountDue: m.amountDue, plan: m.plan },
    ]);
    const now = new Date();
    return jsonOk({
      ...membershipToJson(m, now),
      amountDue: m.amountDue?.toString() ?? m.plan.price.toString(),
      paymentSummary: summaries.get(m.id),
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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Plan not found" || msg === "Member not found") {
      return jsonError(msg, 404);
    }
    throw e;
  }
}
