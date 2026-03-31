import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function GymRegisterNotFound() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-6 bg-background px-6 py-12 text-center">
      <div className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Gym not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This registration link is invalid or the gym may have been removed. Ask your gym for an updated QR code or
          link.
        </p>
      </div>
      <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6")}>
        Go to Fitway
      </Link>
    </div>
  );
}
