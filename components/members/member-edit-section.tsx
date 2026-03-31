"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { deleteMemberAction, updateMemberDetailsAction, type MemberEditState } from "@/app/actions/members-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  member: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    meta: unknown | null;
  };
};

function metaRecord(meta: unknown | null): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as Record<string, unknown>;
}

function metaString(meta: Record<string, unknown>, key: string): string {
  const v = meta[key];
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

const GENDER_OPTIONS = [
  { value: "", label: "—" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_SAY", label: "Prefer not to say" },
] as const;

export function MemberEditSection({ member }: Props) {
  const meta = useMemo(() => metaRecord(member.meta), [member.meta]);
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateMemberDetailsAction, null as MemberEditState);

  useEffect(() => {
    if (!state) return;
    const id = `member-edit-${member.id}`;
    if (state.ok) {
      toast.success("Member updated.", { id });
      setEditing(false);
    } else if (state.error) {
      toast.error(state.error, { id });
    }
  }, [state, member.id]);

  if (!editing) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Manage</h3>
            <p className="mt-1 text-sm text-foreground">Edit or delete this member.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <form
              action={deleteMemberAction}
              onSubmit={(e) => {
                if (!confirm("Delete this member? This cannot be undone.")) e.preventDefault();
              }}
            >
              <input type="hidden" name="memberId" value={member.id} />
              <Button type="submit" variant="destructive">
                Delete
              </Button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Edit member</h3>
          <p className="mt-1 text-xs text-muted-foreground">Updates contact and registration details.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
      </div>

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="memberId" value={member.id} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="m-name">Name</Label>
          <Input id="m-name" name="name" defaultValue={member.name} required maxLength={200} className="h-11" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="m-email">Email</Label>
          <Input
            id="m-email"
            name="email"
            type="email"
            defaultValue={member.email ?? ""}
            required
            maxLength={200}
            className="h-11"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="m-phone">Phone</Label>
          <Input id="m-phone" name="phone" defaultValue={member.phone ?? ""} maxLength={50} className="h-11" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="m-notes">Internal notes</Label>
          <Textarea id="m-notes" name="notes" defaultValue={member.notes ?? ""} maxLength={5000} />
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Registration fields</p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="m-age">Age</Label>
              <Input
                id="m-age"
                name="meta.age"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                step={1}
                defaultValue={metaString(meta, "age")}
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="m-gender">Gender</Label>
              <Select id="m-gender" name="meta.gender" defaultValue={metaString(meta, "gender")} className="h-11">
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="m-weight">Weight (kg)</Label>
              <Input
                id="m-weight"
                name="meta.weight"
                type="number"
                inputMode="decimal"
                min={0}
                max={500}
                step="0.1"
                defaultValue={metaString(meta, "weight")}
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="m-height">Height (cm)</Label>
              <Input
                id="m-height"
                name="meta.height"
                type="number"
                inputMode="decimal"
                min={0}
                max={300}
                step="0.1"
                defaultValue={metaString(meta, "height")}
                className="h-11"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <Label htmlFor="m-goal">Goal</Label>
            <Input id="m-goal" name="meta.goal" defaultValue={metaString(meta, "goal")} maxLength={500} className="h-11" />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <Label htmlFor="m-reg-notes">Registration notes</Label>
            <Textarea id="m-reg-notes" name="meta.notes" defaultValue={metaString(meta, "notes")} maxLength={2000} />
          </div>
        </div>

        <Button type="submit" disabled={pending} className={cn("w-full")} size="lg">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </section>
  );
}

