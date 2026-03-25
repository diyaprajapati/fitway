"use client";

import { useActionState } from "react";
import Link from "next/link";

import { bulkImportMembersAction } from "@/app/actions/member-import";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TEMPLATE_HREF = "/templates/member-bulk-import-template.csv";

export type BulkImportPlanHint = { id: string; name: string };

export function MemberBulkImport({ plans }: { plans: BulkImportPlanHint[] }) {
  const [state, formAction, pending] = useActionState(bulkImportMembersAction, null);

  const successCount =
    state?.ok && state.results ? state.results.filter((r) => r.ok).length : 0;
  const failCount =
    state?.ok && state.results ? state.results.filter((r) => !r.ok).length : 0;

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Use the template so column names match. Each row creates a member, their first membership, and optionally one
        payment. Dates can be <span className="font-medium text-foreground">DD-MM-YYYY</span> or{" "}
        <span className="font-medium text-foreground">YYYY-MM-DD</span>.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href={TEMPLATE_HREF}
          download="fitway-member-import-template.csv"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "inline-flex justify-center no-underline",
          )}
        >
          Download template
        </a>
        <p className="text-xs text-muted-foreground">
          In Excel: use <span className="font-medium text-foreground">Save As → CSV UTF-8</span> before uploading.
        </p>
      </div>

      {plans.length > 0 ? (
        <details className="mt-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-foreground">
            Active plans (use the name in the plan_name column; matching is case-insensitive)
          </summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {plans.map((p) => (
              <li key={p.id} className="wrap-break-word text-[11px] leading-snug">
                <span className="font-medium text-foreground">{p.name}</span>
              </li>
            ))}
          </ul>
          <Link href="/plans" className="mt-2 inline-block font-medium text-primary underline-offset-4 hover:underline">
            Manage plans
          </Link>
        </details>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Add an active plan on the{" "}
          <Link href="/plans" className="font-medium text-primary underline-offset-4 hover:underline">
            Plans
          </Link>{" "}
          tab before importing.
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <div>
          <Label htmlFor="bulk-csv">CSV file</Label>
          <input
            id="bulk-csv"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            disabled={pending || plans.length === 0}
            className="mt-1.5 flex w-full cursor-pointer text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
          />
        </div>
        <Button type="submit" disabled={pending || plans.length === 0} className="w-full sm:w-auto">
          {pending ? "Importing…" : "Import"}
        </Button>
      </form>

      {state && !state.ok ? (
      <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      {state?.ok ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{successCount} imported</span>
            {failCount > 0 ? (
              <>
                {" "}
                · <span className="font-medium text-destructive">{failCount} failed</span>
              </>
            ) : null}
          </p>
          <ul className="max-h-48 overflow-y-auto rounded-xl border border-border text-xs">
            {state.results.map((r) => (
              <li
                key={`${r.rowNumber}-${r.message}`}
                className={cn(
                  "border-b border-border px-2 py-1.5 last:border-b-0",
                  r.ok ? "bg-emerald-500/5" : "bg-destructive/5",
                )}
              >
                <span className="font-mono text-muted-foreground">Row {r.rowNumber}</span> — {r.message}
                {r.memberId ? (
                  <Link
                    href={`/members/${r.memberId}`}
                    className="ml-2 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
