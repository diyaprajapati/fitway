import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireGymSession() {
  const session = await auth();
  const gymId = session?.user?.gymId;
  const userId = session?.user?.id;
  if (!gymId || !userId) {
    redirect("/login");
  }
  return {
    gymId,
    userId,
    email: session.user.email ?? undefined,
    name: session.user.name ?? undefined,
  };
}
