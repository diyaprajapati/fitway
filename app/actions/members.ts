"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { uniqueViolationMessage } from "@/lib/api/prisma-errors";
import { createMemberWithMembership } from "@/lib/services/members";

export type MemberFormState = { error?: string } | null;

export async function createMemberAction(_prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  const session = await auth();
  if (!session?.user?.gymId) {
    return { error: "Not signed in" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const emailRaw = formData.get("email");
  const phoneRaw = formData.get("phone");
  const notesRaw = formData.get("notes");

  const email = emailRaw === "" || emailRaw == null ? null : String(emailRaw).trim();
  const phone = phoneRaw === "" || phoneRaw == null ? null : String(phoneRaw).trim();
  const notes = notesRaw === "" || notesRaw == null ? null : String(notesRaw).trim();
  const planId = String(formData.get("planId") ?? "").trim();
  const startDateRaw = formData.get("startDate");

  if (!name) {
    return { error: "Name is required" };
  }
  if (!planId) {
    return { error: "Choose a membership plan" };
  }

  const startDate = parseMembershipStartDate(startDateRaw);

  try {
    await createMemberWithMembership(session.user.gymId, {
      name,
      email: email || undefined,
      phone: phone || undefined,
      notes: notes || undefined,
      planId,
      startDate,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: uniqueViolationMessage(e) };
    }
    const msg = e instanceof Error ? e.message : "Failed to create member";
    if (msg === "Plan not found") {
      return { error: "That plan is no longer available. Refresh and pick another." };
    }
    return { error: msg };
  }

  revalidatePath("/members");
  redirect("/members");
}

function parseMembershipStartDate(input: FormDataEntryValue | null): Date {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  return new Date();
}
