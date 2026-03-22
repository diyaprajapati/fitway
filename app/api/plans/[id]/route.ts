import { z } from "zod";
import { requireGymSession } from "@/lib/api/session";
import { jsonError, jsonOk } from "@/lib/api/json";
import { deletePlan, getPlan, updatePlan } from "@/lib/services/plans";
import { planToJson } from "@/lib/api/mappers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const plan = await getPlan(auth.session.gymId, id);
  if (!plan) return jsonError("Not found", 404);
  return jsonOk(planToJson(plan));
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
  price: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  try {
    const plan = await updatePlan(auth.session.gymId, id, parsed.data);
    return jsonOk(planToJson(plan));
  } catch {
    return jsonError("Not found", 404);
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    await deletePlan(auth.session.gymId, id);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("Not found or plan is in use", 409);
  }
}
