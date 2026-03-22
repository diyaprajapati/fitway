import { z } from "zod";
import { issueSessionJwt } from "@/lib/auth-token";
import { jsonError, jsonOk } from "@/lib/api/json";
import { registerOwner } from "@/lib/register-owner";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  gymName: z.string().min(1).max(200),
  ownerName: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const result = await registerOwner(parsed.data);
  if (!result.ok) {
    return jsonError(result.error, 409);
  }

  const accessToken = await issueSessionJwt({
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    gymId: result.user.gymId,
  });

  return jsonOk({
    gym: {
      id: result.gym.id,
      name: result.gym.name,
      slug: result.gym.slug,
    },
    user: result.user,
    accessToken,
    token: accessToken,
  });
}
