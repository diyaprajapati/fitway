import { z } from "zod";

export const MEMBER_FORM_OPTIONAL_KEYS = ["age", "gender", "weight", "height", "goal", "notes"] as const;
export type MemberFormOptionalKey = (typeof MEMBER_FORM_OPTIONAL_KEYS)[number];

export type MemberFormFieldSetting = {
  enabled: boolean;
  required: boolean;
};

export type ResolvedMemberFormConfig = Record<MemberFormOptionalKey, MemberFormFieldSetting>;

const fieldSettingSchema = z.object({
  enabled: z.boolean(),
  required: z.boolean(),
});

/** Full payload for gym.memberFormConfig (all optional keys defined). */
export const storedMemberFormConfigSchema = z
  .object({
    age: fieldSettingSchema,
    gender: fieldSettingSchema,
    weight: fieldSettingSchema,
    height: fieldSettingSchema,
    goal: fieldSettingSchema,
    notes: fieldSettingSchema,
  })
  .superRefine((val, ctx) => {
    for (const key of MEMBER_FORM_OPTIONAL_KEYS) {
      if (val[key].required && !val[key].enabled) {
        ctx.addIssue({
          code: "custom",
          message: "Required fields must be enabled for that field",
          path: [key, "required"],
        });
      }
    }
  });

export type StoredMemberFormConfig = z.infer<typeof storedMemberFormConfigSchema>;

export const DEFAULT_MEMBER_FORM_CONFIG: ResolvedMemberFormConfig = {
  age: { enabled: false, required: false },
  gender: { enabled: false, required: false },
  weight: { enabled: false, required: false },
  height: { enabled: false, required: false },
  goal: { enabled: false, required: false },
  notes: { enabled: false, required: false },
};

function normalizeFieldSetting(raw: unknown): MemberFormFieldSetting {
  // Business rule: when a gym enables a field, it's compulsory.
  if (raw === true) return { enabled: true, required: true };
  if (raw === false || raw == null) return { enabled: false, required: false };
  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    const enabled = Boolean(o.enabled);
    return { enabled, required: enabled };
  }
  return { enabled: false, required: false };
}

/** Merge DB JSON with defaults; supports legacy `{ age: true }` or `{ age: { enabled, required } }`. */
export function parseMemberFormConfig(raw: unknown): ResolvedMemberFormConfig {
  const out = { ...DEFAULT_MEMBER_FORM_CONFIG };
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return out;
  }
  const o = raw as Record<string, unknown>;
  for (const key of MEMBER_FORM_OPTIONAL_KEYS) {
    if (key in o) {
      out[key] = normalizeFieldSetting(o[key]);
    }
  }
  return out;
}

export const MEMBER_FORM_FIELD_LABELS: Record<MemberFormOptionalKey, string> = {
  age: "Age",
  gender: "Gender",
  weight: "Weight (kg)",
  height: "Height (cm)",
  goal: "Goal",
  notes: "Notes",
};
