import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { issueSessionJwt } from "@/lib/auth-token";
import { verifyCredentials } from "@/lib/auth-credentials";
import { jsonError, jsonOk } from "@/lib/api/json";

/**
 * JSON login: returns Auth.js session JWT (`accessToken` / `token`) and sets cookies via `signIn`.
 * Use protected APIs with `Authorization: Bearer <accessToken>` or the session cookie.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const email = typeof body === "object" && body && "email" in body ? String((body as { email: unknown }).email) : "";
  const password =
    typeof body === "object" && body && "password" in body ? String((body as { password: unknown }).password) : "";

  if (!email || !password) {
    return jsonError("email and password are required", 400);
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return jsonError("Invalid email or password", 401);
  }

  const accessToken = await issueSessionJwt(user);

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof CredentialsSignin || e instanceof AuthError) {
      // Still return JWT; browser cookie session may not be set.
    } else {
      throw e;
    }
  }

  return jsonOk({
    ok: true,
    accessToken,
    token: accessToken,
  });
}
