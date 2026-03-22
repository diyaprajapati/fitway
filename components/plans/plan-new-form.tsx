"use client";

import { useActionState } from "react";

import { createPlanAction } from "@/app/actions/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PlanNewForm() {
  const [state, formAction, pending] = useActionState(createPlanAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="name">Plan name</Label>
        <Input id="name" name="name" required placeholder="e.g. Monthly unlimited" />
      </div>
      <div>
        <Label htmlFor="durationDays">Duration (days)</Label>
        <Input id="durationDays" name="durationDays" type="number" required min={1} step={1} defaultValue={30} />
      </div>
      <div>
        <Label htmlFor="price">Price (INR)</Label>
        <Input id="price" name="price" type="number" required min={0} step={0.01} placeholder="0.00" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Create plan"}
      </Button>
    </form>
  );
}
