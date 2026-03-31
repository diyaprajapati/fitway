import { z } from "zod";
import { allowPublicRegisterRequest, clientKeyFromRequest } from "@/lib/api/public-rate-limit";
import { jsonError, jsonOk } from "@/lib/api/json";
import { validateAndSanitizePublicMeta } from "@/lib/public-register-meta";
import { getGymConfigForPublicRegister, registerPublicMember } from "@/lib/services/public-registration";

const bodySchema = z.object({
  gymId: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(32),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const key = clientKeyFromRequest(req);
  if (!allowPublicRegisterRequest(key)) {
    return jsonError("Too many requests. Try again in a minute.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const gymCfg = await getGymConfigForPublicRegister(parsed.data.gymId);
  if (!gymCfg) {
    return jsonError("Gym not found", 404);
  }

  const metaResult = validateAndSanitizePublicMeta(parsed.data.meta, gymCfg.formConfig);
  if (!metaResult.ok) {
    return jsonError(metaResult.message, 400);
  }

  const result = await registerPublicMember({
    gymId: parsed.data.gymId,
    name: parsed.data.name,
    email: parsed.data.email,
    phoneRaw: parsed.data.phone,
    meta: metaResult.meta,
  });

  if ("error" in result) {
    if (result.error === "gym_not_found") {
      return jsonError("Gym not found", 404);
    }
    return jsonError("Enter a valid phone number (10–15 digits)", 400);
  }

  const message = result.created
    ? "You have been added as a member."
    : "You are already registered. Your details were updated.";

  return jsonOk({
    success: true,
    message,
    memberId: result.memberId,
    existing: !result.created,
  });
}
