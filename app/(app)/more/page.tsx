import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/actions/auth";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "More",
};

export default async function MorePage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">More</h2>
        <p className="mt-1 text-sm text-muted-foreground">Account and session.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Signed in as</p>
        <p className="mt-1 font-medium">{session?.user?.email ?? "—"}</p>
        {session?.user?.name ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{session.user.name}</p>
        ) : null}
      </div>

      <Link
        href="/settings/form"
        className={cn(buttonVariants({ variant: "secondary" }), "h-11 w-full justify-center")}
      >
        Public registration form
      </Link>

      <form action={signOutAction}>
        <Button type="submit" variant="secondary" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
