import { z } from "zod";
import { requireGymSession } from "@/lib/api/session";
import { jsonError, jsonOk } from "@/lib/api/json";
import { getGymById, updateGym } from "@/lib/services/gym";

export async function GET(req: Request) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const gym = await getGymById(auth.session.gymId);
  if (!gym) return jsonError("Gym not found", 404);

  return jsonOk(gym);
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(80).nullable().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

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
    const gym = await updateGym(auth.session.gymId, parsed.data);
    return jsonOk(gym);
  } catch {
    return jsonError("Could not update gym (slug may be taken)", 409);
  }
}
