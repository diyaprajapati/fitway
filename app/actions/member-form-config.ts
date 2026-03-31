"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { storedMemberFormConfigSchema } from "@/lib/member-form-config";
import { updateGym } from "@/lib/services/gym";

export type MemberFormConfigState = { error?: string; ok?: boolean } | null;

export async function updateMemberFormConfigAction(
  _prev: MemberFormConfigState,
  formData: FormData,
): Promise<MemberFormConfigState> {
  const session = await auth();
  if (!session?.user?.gymId) {
    return { error: "Not signed in" };
  }

  const raw = formData.get("config");
  if (typeof raw !== "string" || raw.length === 0) {
    return { error: "Missing configuration" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "Invalid configuration JSON" };
  }

  const parsed = storedMemberFormConfigSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  // Business rule: any enabled field is compulsory.
  const enforced = {
    age: { enabled: parsed.data.age.enabled, required: parsed.data.age.enabled },
    gender: { enabled: parsed.data.gender.enabled, required: parsed.data.gender.enabled },
    weight: { enabled: parsed.data.weight.enabled, required: parsed.data.weight.enabled },
    height: { enabled: parsed.data.height.enabled, required: parsed.data.height.enabled },
    goal: { enabled: parsed.data.goal.enabled, required: parsed.data.goal.enabled },
    notes: { enabled: parsed.data.notes.enabled, required: parsed.data.notes.enabled },
  };

  try {
    await updateGym(session.user.gymId, {
      memberFormConfig: enforced,
    });
  } catch {
    return { error: "Could not save settings" };
  }

  revalidatePath("/settings/form");
  return { ok: true };
}
