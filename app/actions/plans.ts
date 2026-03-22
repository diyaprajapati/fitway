"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createPlan } from "@/lib/services/plans";

export type PlanFormState = { error?: string } | null;

export async function createPlanAction(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const session = await auth();
  if (!session?.user?.gymId) {
    return { error: "Not signed in" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const durationRaw = formData.get("durationDays");
  const priceRaw = formData.get("price");

  const durationDays = typeof durationRaw === "string" ? Number.parseInt(durationRaw, 10) : NaN;
  const price = typeof priceRaw === "string" ? Number.parseFloat(priceRaw) : NaN;

  if (!name) {
    return { error: "Plan name is required" };
  }
  if (!Number.isFinite(durationDays) || durationDays < 1) {
    return { error: "Duration must be at least 1 day" };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be zero or more" };
  }

  try {
    await createPlan(session.user.gymId, {
      name,
      durationDays,
      price,
      active: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create plan";
    return { error: msg };
  }

  revalidatePath("/plans");
  revalidatePath("/members/new");
  redirect("/plans");
}
