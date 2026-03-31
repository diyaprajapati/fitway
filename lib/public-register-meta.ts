import { z } from "zod";

import {
  MEMBER_FORM_FIELD_LABELS,
  type MemberFormOptionalKey,
  type ResolvedMemberFormConfig,
} from "@/lib/member-form-config";

export type SanitizedMemberMeta = {
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  goal?: string;
  notes?: string;
};

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_SAY"]);

function label(key: MemberFormOptionalKey): string {
  return MEMBER_FORM_FIELD_LABELS[key];
}

export function validateAndSanitizePublicMeta(
  rawMeta: unknown,
  config: ResolvedMemberFormConfig,
): { ok: true; meta: SanitizedMemberMeta } | { ok: false; message: string } {
  const obj =
    rawMeta == null
      ? {}
      : typeof rawMeta === "object" && !Array.isArray(rawMeta)
        ? (rawMeta as Record<string, unknown>)
        : null;
  if (obj === null) {
    return { ok: false, message: "Invalid meta object" };
  }

  const meta: SanitizedMemberMeta = {};
  const keys: MemberFormOptionalKey[] = ["age", "gender", "weight", "height", "goal", "notes"];

  for (const key of keys) {
    const fc = config[key];
    if (!fc.enabled) continue;

    const v = obj[key];
    const missing = v === undefined || v === null || (typeof v === "string" && v.trim() === "");

    // Business rule: if gym enables a field, it becomes compulsory.
    if (missing) {
      return { ok: false, message: `${label(key)} is required` };
    }

    switch (key) {
      case "age": {
        const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
        const a = z.number().int().min(1).max(120).safeParse(n);
        if (!a.success) return { ok: false, message: "Enter a valid age" };
        meta.age = a.data;
        break;
      }
      case "gender": {
        const s = String(v).trim();
        const g = genderEnum.safeParse(s);
        if (!g.success) return { ok: false, message: "Select a valid gender" };
        meta.gender = g.data;
        break;
      }
      case "weight": {
        const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
        const w = z.number().positive().max(500).safeParse(n);
        if (!w.success) return { ok: false, message: "Enter a valid weight (kg)" };
        meta.weight = w.data;
        break;
      }
      case "height": {
        const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
        const h = z.number().positive().max(300).safeParse(n);
        if (!h.success) return { ok: false, message: "Enter a valid height (cm)" };
        meta.height = h.data;
        break;
      }
      case "goal": {
        const s = String(v).trim();
        const g = z.string().min(1).max(500).safeParse(s);
        if (!g.success) return { ok: false, message: "Goal is invalid" };
        meta.goal = g.data;
        break;
      }
      case "notes": {
        const s = String(v).trim();
        const n = z.string().max(2000).safeParse(s);
        if (!n.success) return { ok: false, message: "Notes are too long" };
        if (s.length > 0) meta.notes = n.data;
        break;
      }
      default:
        break;
    }
  }

  return { ok: true, meta };
}
