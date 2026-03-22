import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth();
  if (session?.user?.gymId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fitway</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Gym CRM, simplified</h1>
        <p className="mt-3 text-muted-foreground">
          Manage members, plans, memberships, and payments in one place—scoped to your gym.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full justify-center sm:w-auto")}>
            Sign in
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "w-full justify-center sm:w-auto",
            )}
          >
            Register gym
          </Link>
        </div>
      </div>
    </div>
  );
}
