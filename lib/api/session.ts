import { decode } from "@auth/core/jwt";
import { getSessionCookieName } from "@/lib/auth-token";

export type GymSession = {
  userId: string;
  gymId: string;
  email?: string;
};

/**
 * Validates **only** the `Authorization: Bearer` value.
 * Does not use `getToken()` — that prefers session cookies and would let cookie auth bypass Bearer.
 */
export async function verifyBearerToken(request: Request): Promise<GymSession | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const raw = authHeader.slice("Bearer ".length).trim();
  if (!raw) {
    return null;
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) is not set");
  }

  const salt = getSessionCookieName();

  let payload: unknown;
  try {
    payload = await decode({
      token: raw,
      secret,
      salt,
    });
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const p = payload as Record<string, unknown>;
  const sub = p.sub;
  const gymId = p.gymId;
  const email = p.email;

  if (typeof sub !== "string" || typeof gymId !== "string") {
    return null;
  }

  return {
    userId: sub,
    gymId,
    email: typeof email === "string" ? email : undefined,
  };
}


/**
 * Protects REST API routes: **only** a valid `Authorization: Bearer <accessToken>`.
 * Cookies are never used for authorization on these handlers.
 */
export async function requireGymSession(request: Request): Promise<
  { ok: true; session: GymSession } | { ok: false; response: Response }
> {
  try {
    const session = await verifyBearerToken(request);
    if (!session) {
      return {
        ok: false,
        response: Response.json(
          {
            error: "Unauthorized",
            hint: "Send Authorization: Bearer <accessToken> from POST /api/auth/login or /api/auth/register",
          },
          { status: 401 },
        ),
      };
    }
    return { ok: true, session };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Configuration error";
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized", detail: message }, { status: 500 }),
    };
  }
}
