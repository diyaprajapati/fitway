import type { Metadata } from "next";
import Link from "next/link";

import { PlanNewForm } from "@/components/plans/plan-new-form";

export const metadata: Metadata = {
  title: "New plan",
};

export default function NewPlanPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/plans" className="text-sm text-muted-foreground hover:text-foreground">
          ← Plans
        </Link>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">New plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">Members will pick this when they join.</p>
      </div>
      <PlanNewForm />
    </div>
  );
}
