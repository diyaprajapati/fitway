import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/api/session";

/**
 * Runs only for matcher routes below — every hit must present a valid Bearer token.
 * Public routes (e.g. /api/public/register and /gym/.../register) are not matched here.
 */
export async function middleware(request: NextRequest) {
  try {
    const session = await verifyBearerToken(request);
    if (!session) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          hint: "Send header: Authorization: Bearer <accessToken> from login or register",
        },
        { status: 401 },
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: "Unauthorized", detail: message }, { status: 500 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/gym/:path*",
    "/api/members/:path*",
    "/api/plans/:path*",
    "/api/memberships/:path*",
    "/api/payments/:path*",
    "/api/analytics/:path*",
  ],
};
