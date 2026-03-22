import { z } from "zod";
import { requireGymSession } from "@/lib/api/session";
import { isUniqueViolation, uniqueViolationMessage } from "@/lib/api/prisma-errors";
import { jsonError, jsonOk } from "@/lib/api/json";
import { createMember, listMembers } from "@/lib/services/members";

export async function GET(req: Request) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;

  const members = await listMembers(auth.session.gymId, search);
  return jsonOk(members);
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
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

  try {
    const member = await createMember(auth.session.gymId, parsed.data);
    return jsonOk(member);
  } catch (e) {
    if (isUniqueViolation(e)) {
      return jsonError(uniqueViolationMessage(e), 409);
    }
    throw e;
  }
}
