"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { updateMemberFormConfigAction } from "@/app/actions/member-form-config";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_MEMBER_FORM_CONFIG,
  MEMBER_FORM_FIELD_LABELS,
  MEMBER_FORM_OPTIONAL_KEYS,
  type MemberFormOptionalKey,
  type ResolvedMemberFormConfig,
} from "@/lib/member-form-config";
import { cn } from "@/lib/utils";

function cloneConfig(c: ResolvedMemberFormConfig): ResolvedMemberFormConfig {
  return {
    age: { ...c.age },
    gender: { ...c.gender },
    weight: { ...c.weight },
    height: { ...c.height },
    goal: { ...c.goal },
    notes: { ...c.notes },
  };
}

export function MemberFormSettings({ initial }: { initial: ResolvedMemberFormConfig }) {
  const router = useRouter();
  const [config, setConfig] = useState<ResolvedMemberFormConfig>(() => cloneConfig(initial));
  const [state, formAction, pending] = useActionState(updateMemberFormConfigAction, null);

  useEffect(() => {
    setConfig(cloneConfig(initial));
  }, [initial]);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  function setField(key: MemberFormOptionalKey, patch: Partial<{ enabled: boolean }>) {
    setConfig((prev) => {
      const next = cloneConfig(prev);
      const cur = next[key];
      if (patch.enabled !== undefined) {
        cur.enabled = patch.enabled;
        cur.required = patch.enabled;
      }
      next[key] = cur;
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="config" value={JSON.stringify(config)} />

      {state?.error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary" role="status">
          Registration form saved.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {MEMBER_FORM_OPTIONAL_KEYS.map((key) => {
          const row = config[key] ?? DEFAULT_MEMBER_FORM_CONFIG[key];
          const label = MEMBER_FORM_FIELD_LABELS[key];
          return (
            <li
              key={key}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{label}</span>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => setField(key, { enabled: e.target.checked })}
                    className={cn("size-4 rounded border-input accent-primary")}
                  />
                  Show
                </label>
              </div>
              {row.enabled ? (
                <p className="text-sm text-muted-foreground">Required (enabled fields are compulsory)</p>
              ) : (
                <p className="text-sm text-muted-foreground/60">Disabled</p>
              )}
            </li>
          );
        })}
      </ul>

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Saving…" : "Save registration form"}
      </Button>
    </form>
  );
}
