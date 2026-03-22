import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      gymId: string;
    } & DefaultSession["user"];
  }

  interface User {
    gymId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    gymId?: string;
  }
}
