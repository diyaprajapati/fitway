import { z } from "zod";
import { requireGymSession } from "@/lib/api/session";
import { jsonError, jsonOk } from "@/lib/api/json";
import { createPlan, listPlans } from "@/lib/services/plans";
import { planToJson } from "@/lib/api/mappers";

export async function GET(req: Request) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const plans = await listPlans(auth.session.gymId, activeOnly);
  return jsonOk(plans.map(planToJson));
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  durationDays: z.number().int().min(1).max(3650),
  price: z.number().nonnegative(),
  active: z.boolean().optional(),
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

  const plan = await createPlan(auth.session.gymId, parsed.data);
  return jsonOk(planToJson(plan));
}
