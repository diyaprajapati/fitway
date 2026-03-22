import { z } from "zod";
import { requireGymSession } from "@/lib/api/session";
import { isUniqueViolation, uniqueViolationMessage } from "@/lib/api/prisma-errors";
import { jsonError, jsonOk } from "@/lib/api/json";
import { deleteMember, getMember, updateMember } from "@/lib/services/members";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const member = await getMember(auth.session.gymId, id);
  if (!member) return jsonError("Not found", 404);
  return jsonOk(member);
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
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
    const member = await updateMember(auth.session.gymId, id, parsed.data);
    return jsonOk(member);
  } catch (e) {
    if (isUniqueViolation(e)) {
      return jsonError(uniqueViolationMessage(e), 409);
    }
    return jsonError("Not found", 404);
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    await deleteMember(auth.session.gymId, id);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("Not found", 404);
  }
}
