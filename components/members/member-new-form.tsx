"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { createMemberAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PlanOption = {
  id: string;
  name: string;
  durationDays: number;
  priceLabel: string;
};

export function MemberNewForm({
  plans,
  defaultStartDate,
}: {
  plans: PlanOption[];
  defaultStartDate: string;
}) {
  const [state, formAction, pending] = useActionState(createMemberAction, null);
  const [planId, setPlanId] = useState("");
  const selectedPlan = planId ? plans.find((p) => p.id === planId) : undefined;

  if (plans.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Add at least one active plan before you can enroll a member.
        </p>
        <Link href="/plans/new" className={cn(buttonVariants(), "mt-4 inline-flex justify-center")}>
          Add plan
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="min-w-0 w-full max-w-full">
        <Label htmlFor="planId">Plan</Label>
        <div className="mt-1.5 min-w-0 max-w-full">
          <Select
            id="planId"
            name="planId"
            required
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="" disabled>
              Select a plan…
            </option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {p.priceLabel}
              </option>
            ))}
          </Select>
        </div>
        {selectedPlan ? (
          <p className="mt-1.5 wrap-break-word text-xs leading-snug text-muted-foreground">
            {selectedPlan.durationDays} days · {selectedPlan.priceLabel}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Need another option?{" "}
          <Link href="/plans/new" className="font-medium text-primary underline-offset-4 hover:underline">
            Add a plan
          </Link>
        </p>
      </div>
      <div>
        <Label htmlFor="startDate">Membership starts</Label>
        <Input id="startDate" name="startDate" type="date" required defaultValue={defaultStartDate} />
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required autoComplete="name" placeholder="Full name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="Optional" />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="Optional" />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Optional" rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Add member"}
      </Button>
    </form>
  );
}
