import { encode } from "@auth/core/jwt";

const MAX_AGE_SEC = 30 * 24 * 60 * 60;

/** Cookie name used as JWT salt — must match Auth.js (`defaultCookies`). */
export function getSessionCookieName(): string {
  const secure = (() => {
    const u = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
    if (!u) return false;
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  })();
  const prefix = secure ? "__Secure-" : "";
  return `${prefix}authjs.session-token`;
}

export async function issueSessionJwt(user: {
  id: string;
  email: string;
  name?: string | null;
  gymId: string;
}): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) is not set");
  }

  return encode({
    secret,
    salt: getSessionCookieName(),
    maxAge: MAX_AGE_SEC,
    token: {
      sub: user.id,
      email: user.email,
      name: user.name ?? undefined,
      gymId: user.gymId,
    },
  });
}
