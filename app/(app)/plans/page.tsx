import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { listPlans } from "@/lib/services/plans";
import { requireGymSession } from "@/lib/server/gym-auth";

export const metadata: Metadata = {
  title: "Plans",
};

function formatMoney(amount: { toString(): string }) {
  const n = Number(amount.toString());
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export default async function PlansPage() {
  const { gymId } = await requireGymSession();
  const plans = await listPlans(gymId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Plans</h2>
          <p className="mt-1 text-sm text-muted-foreground">Membership products and pricing.</p>
        </div>
        <Link href="/plans/new" className={cn(buttonVariants(), "inline-flex shrink-0 justify-center text-center")}>
          Add plan
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {plans.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No plans yet.{" "}
            <Link href="/plans/new" className="font-medium text-primary underline-offset-4 hover:underline">
              Add your first plan
            </Link>{" "}
            so new members can choose one.
          </li>
        ) : (
          plans.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {p.durationDays} days · {p.active ? "Active" : "Inactive"}
                </p>
              </div>
              <p className="shrink-0 text-lg font-semibold tabular-nums">{formatMoney(p.price)}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
