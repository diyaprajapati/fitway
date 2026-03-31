"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { uniqueViolationMessage } from "@/lib/api/prisma-errors";
import { updateMember, deleteMember } from "@/lib/services/members";

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_SAY"]);

function toOptionalInt(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (s.length === 0) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function toOptionalString(v: FormDataEntryValue | null, max: number): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (s.length === 0) return undefined;
  return s.length > max ? s.slice(0, max) : s;
}

export type MemberEditState =
  | null
  | {
      ok?: boolean;
      error?: string;
    };

export async function updateMemberDetailsAction(_prev: MemberEditState, formData: FormData): Promise<MemberEditState> {
  const session = await auth();
  const gymId = session?.user?.gymId;
  if (!gymId) return { error: "Not signed in" };

  const memberId = String(formData.get("memberId") ?? "").trim();
  if (!memberId) return { error: "Missing member id" };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phoneRaw = formData.get("phone");
  const notesRaw = formData.get("notes");

  if (!name) return { error: "Name is required" };
  if (!email) return { error: "Email is required" };

  const shape = z
    .object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(200),
      phone: z.string().max(50).nullable().optional(),
      notes: z.string().max(5000).nullable().optional(),
    })
    .safeParse({
      name,
      email,
      phone: phoneRaw == null || String(phoneRaw).trim() === "" ? null : String(phoneRaw).trim(),
      notes: notesRaw == null || String(notesRaw).trim() === "" ? null : String(notesRaw).trim(),
    });
  if (!shape.success) {
    return { error: shape.error.issues.map((i) => i.message).join(", ") };
  }

  // Meta (registration extras). All are optional in internal edit.
  const meta: Record<string, unknown> = {};
  const age = toOptionalInt(formData.get("meta.age"));
  if (age !== undefined) {
    const a = z.number().int().min(1).max(120).safeParse(age);
    if (!a.success) return { error: "Age must be a whole number between 1 and 120" };
    meta.age = a.data;
  }
  const genderRaw = toOptionalString(formData.get("meta.gender"), 32);
  if (genderRaw !== undefined) {
    const g = genderEnum.safeParse(genderRaw);
    if (!g.success) return { error: "Gender is invalid" };
    meta.gender = g.data;
  }
  const weight = toOptionalInt(formData.get("meta.weight"));
  if (weight !== undefined) {
    const w = z.number().positive().max(500).safeParse(weight);
    if (!w.success) return { error: "Weight must be between 0 and 500 kg" };
    meta.weight = w.data;
  }
  const height = toOptionalInt(formData.get("meta.height"));
  if (height !== undefined) {
    const h = z.number().positive().max(300).safeParse(height);
    if (!h.success) return { error: "Height must be between 0 and 300 cm" };
    meta.height = h.data;
  }
  const goal = toOptionalString(formData.get("meta.goal"), 500);
  if (goal !== undefined) meta.goal = goal;
  const regNotes = toOptionalString(formData.get("meta.notes"), 2000);
  if (regNotes !== undefined) meta.notes = regNotes;

  try {
    await updateMember(gymId, memberId, {
      ...shape.data,
      meta: (Object.keys(meta).length === 0 ? null : (meta as Prisma.InputJsonValue)),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: uniqueViolationMessage(e) };
    }
    return { error: "Could not update member" };
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  return { ok: true };
}

export async function deleteMemberAction(formData: FormData): Promise<void> {
  const session = await auth();
  const gymId = session?.user?.gymId;
  if (!gymId) redirect("/login");

  const memberId = String(formData.get("memberId") ?? "").trim();
  if (!memberId) redirect("/members");

  await deleteMember(gymId, memberId);
  revalidatePath("/members");
  redirect("/members");
}

