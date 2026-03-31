"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MEMBER_FORM_FIELD_LABELS, type ResolvedMemberFormConfig } from "@/lib/member-form-config";
import { isValidPhoneFormat } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  gymId: string;
  gymName: string;
  formConfig: ResolvedMemberFormConfig;
};

type ApiOk = {
  success: true;
  message: string;
  memberId: string;
  existing: boolean;
};

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_SAY", label: "Prefer not to say" },
] as const;

type FieldKey = "name" | "email" | "phone" | "age" | "gender" | "weight" | "height" | "goal" | "notes";
type FieldErrors = Partial<Record<FieldKey, string>>;
type FieldTouched = Partial<Record<FieldKey, boolean>>;

function isValidEmailFormat(v: string): boolean {
  // Simple, user-friendly check; server still enforces Zod email format.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function GymRegisterForm({ gymId, gymName, formConfig }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ApiOk | null>(null);
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState<FieldTouched>({});
  const [submittedOnce, setSubmittedOnce] = useState(false);

  const anyOptional = useMemo(
    () =>
      formConfig.age.enabled ||
      formConfig.gender.enabled ||
      formConfig.weight.enabled ||
      formConfig.height.enabled ||
      formConfig.goal.enabled ||
      formConfig.notes.enabled,
    [formConfig],
  );

  const errors: FieldErrors = useMemo(() => {
    const e: FieldErrors = {};
    const n = name.trim();
    if (!n) e.name = "Please enter your full name.";
    else if (n.length > 120) e.name = "Name must be 120 characters or less.";

    const em = email.trim();
    if (!em) e.email = "Please enter your email address.";
    else if (em.length > 200) e.email = "Email must be 200 characters or less.";
    else if (!isValidEmailFormat(em)) e.email = "Please enter a valid email (e.g. name@example.com).";

    const p = phone.trim();
    if (!p) e.phone = "Please enter your phone number.";
    else if (!isValidPhoneFormat(p)) e.phone = "Please enter a valid phone number (10–15 digits).";

    if (formConfig.age.enabled) {
      if (!age.trim()) e.age = "Please enter your age.";
      else {
        const a = Number(age);
        if (!Number.isInteger(a) || a < 1 || a > 120) e.age = "Age must be a whole number between 1 and 120.";
      }
    }
    if (formConfig.gender.enabled) {
      if (!gender) e.gender = "Please select your gender.";
      else if (!GENDER_OPTIONS.some((o) => o.value === gender)) e.gender = "Please select a valid gender option.";
    }
    if (formConfig.weight.enabled) {
      if (!weight.trim()) e.weight = "Please enter your weight.";
      else {
        const w = Number(weight);
        if (!Number.isFinite(w) || w <= 0 || w > 500) e.weight = "Weight must be between 0 and 500 kg.";
      }
    }
    if (formConfig.height.enabled) {
      if (!height.trim()) e.height = "Please enter your height.";
      else {
        const h = Number(height);
        if (!Number.isFinite(h) || h <= 0 || h > 300) e.height = "Height must be between 0 and 300 cm.";
      }
    }
    if (formConfig.goal.enabled) {
      const g = goal.trim();
      if (!g) e.goal = "Please enter your goal.";
      else if (g.length > 500) e.goal = "Goal must be 500 characters or less.";
    }
    if (formConfig.notes.enabled) {
      const t = notes.trim();
      if (!t) e.notes = "Please enter your notes.";
      else if (t.length > 2000) e.notes = "Notes must be 2000 characters or less.";
    }
    return e;
  }, [age, email, formConfig, gender, goal, height, name, notes, phone, weight]);

  const canSubmit = Object.keys(errors).length === 0 && !pending;

  function buildMeta(): Record<string, unknown> | undefined {
    const meta: Record<string, unknown> = {};
    if (formConfig.age.enabled) {
      if (age.trim()) meta.age = Number(age);
    }
    if (formConfig.gender.enabled) {
      if (gender) meta.gender = gender;
    }
    if (formConfig.weight.enabled) {
      if (weight.trim()) meta.weight = Number(weight);
    }
    if (formConfig.height.enabled) {
      if (height.trim()) meta.height = Number(height);
    }
    if (formConfig.goal.enabled) {
      if (goal.trim()) meta.goal = goal.trim();
    }
    if (formConfig.notes.enabled) {
      if (notes.trim()) meta.notes = notes.trim();
    }
    return Object.keys(meta).length > 0 ? meta : undefined;
  }

  function showError(key: FieldKey): boolean {
    return Boolean(errors[key]) && (submittedOnce || Boolean(touched[key]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError(null);
    setServerError(null);
    setSubmittedOnce(true);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const n = name.trim();
    const meta = buildMeta();
    const emailValue = email.trim();

    setPending(true);
    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymId,
          name: n,
          email: emailValue,
          phone: phone.trim(),
          ...(meta ? { meta } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<ApiOk>;

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      if (data.success && data.message && data.memberId != null && data.existing != null) {
        setSuccess({
          success: true,
          message: data.message,
          memberId: data.memberId,
          existing: data.existing,
        });
        return;
      }
      setServerError("Unexpected response. Try again.");
    } catch {
      setServerError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="rounded-xl bg-primary/10 px-4 py-3 text-center">
          <p className="text-sm font-medium text-primary">You are in</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{gymName}</p>
        </div>
        <p className="text-center text-base text-foreground">{success.message}</p>
        <p className="text-center text-sm text-muted-foreground">Thank you for joining.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-center text-sm text-muted-foreground">Join</p>
        <p className="mt-1 text-center text-xl font-semibold tracking-tight text-foreground">{gymName}</p>
      </div>

      {(clientError || serverError) && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {clientError ?? serverError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-name" className="text-base">
          Name
        </Label>
        <Input
          id="reg-name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          aria-invalid={showError("name")}
          aria-describedby={showError("name") ? "reg-name-error" : undefined}
          className="h-14 text-lg"
        />
        <FieldError id="reg-name-error" message={showError("name") ? errors.name : undefined} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-phone" className="text-base">
          Phone
        </Label>
        <Input
          id="reg-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="Mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          aria-invalid={showError("phone")}
          aria-describedby={showError("phone") ? "reg-phone-error" : undefined}
          className="h-14 text-lg"
        />
        <FieldError id="reg-phone-error" message={showError("phone") ? errors.phone : undefined} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-email" className="text-base">
          Email
        </Label>
        <Input
          id="reg-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={200}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          aria-invalid={showError("email")}
          aria-describedby={showError("email") ? "reg-email-error" : undefined}
          className="h-14 text-lg"
        />
        <FieldError id="reg-email-error" message={showError("email") ? errors.email : undefined} />
      </div>

      {formConfig.age.enabled ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reg-age" className="text-base">
            {MEMBER_FORM_FIELD_LABELS.age}
          </Label>
          <Input
            id="reg-age"
            name="age"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            step={1}
            required
            placeholder="Years"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, age: true }))}
            aria-invalid={showError("age")}
            aria-describedby={showError("age") ? "reg-age-error" : undefined}
            className="h-14 text-lg"
          />
          <FieldError id="reg-age-error" message={showError("age") ? errors.age : undefined} />
        </div>
      ) : null}

      {formConfig.gender.enabled ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reg-gender" className="text-base">
            {MEMBER_FORM_FIELD_LABELS.gender}
          </Label>
          <Select
            id="reg-gender"
            name="gender"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, gender: true }))}
            aria-invalid={showError("gender")}
            aria-describedby={showError("gender") ? "reg-gender-error" : undefined}
            className="h-14 text-lg"
          >
            <option value="" disabled>
              Select…
            </option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <FieldError id="reg-gender-error" message={showError("gender") ? errors.gender : undefined} />
        </div>
      ) : null}

      {formConfig.weight.enabled ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reg-weight" className="text-base">
            {MEMBER_FORM_FIELD_LABELS.weight}
          </Label>
          <Input
            id="reg-weight"
            name="weight"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            required
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, weight: true }))}
            aria-invalid={showError("weight")}
            aria-describedby={showError("weight") ? "reg-weight-error" : undefined}
            className="h-14 text-lg"
          />
          <FieldError id="reg-weight-error" message={showError("weight") ? errors.weight : undefined} />
        </div>
      ) : null}

      {formConfig.height.enabled ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reg-height" className="text-base">
            {MEMBER_FORM_FIELD_LABELS.height}
          </Label>
          <Input
            id="reg-height"
            name="height"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            required
            placeholder="cm"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, height: true }))}
            aria-invalid={showError("height")}
            aria-describedby={showError("height") ? "reg-height-error" : undefined}
            className="h-14 text-lg"
          />
          <FieldError id="reg-height-error" message={showError("height") ? errors.height : undefined} />
        </div>
      ) : null}

      {formConfig.goal.enabled ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reg-goal" className="text-base">
            {MEMBER_FORM_FIELD_LABELS.goal}
          </Label>
          <Input
            id="reg-goal"
            name="goal"
            required
            maxLength={500}
            placeholder="e.g. muscle gain, fat loss"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, goal: true }))}
            aria-invalid={showError("goal")}
            aria-describedby={showError("goal") ? "reg-goal-error" : undefined}
            className="h-14 text-lg"
          />
          <FieldError id="reg-goal-error" message={showError("goal") ? errors.goal : undefined} />
        </div>
      ) : null}

      {formConfig.notes.enabled ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reg-notes" className="text-base">
            {MEMBER_FORM_FIELD_LABELS.notes}
          </Label>
          <Textarea
            id="reg-notes"
            name="notes"
            rows={3}
            required
            maxLength={2000}
            placeholder="Anything we should know?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, notes: true }))}
            aria-invalid={showError("notes")}
            aria-describedby={showError("notes") ? "reg-notes-error" : undefined}
            className="min-h-22 resize-y text-base"
          />
          <FieldError id="reg-notes-error" message={showError("notes") ? errors.notes : undefined} />
        </div>
      ) : null}

      {!anyOptional ? (
        <p className="text-center text-xs text-muted-foreground">Only name and phone are collected for this gym.</p>
      ) : null}

      <Button type="submit" size="lg" disabled={!canSubmit} className={cn("h-14 w-full text-lg font-semibold")}>
        {pending ? "Joining…" : "Join Gym"}
      </Button>
    </form>
  );
}
