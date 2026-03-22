import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { listMembers } from "@/lib/services/members";
import { requireGymSession } from "@/lib/server/gym-auth";

export const metadata: Metadata = {
  title: "Members",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { gymId } = await requireGymSession();
  const { q } = await searchParams;
  const search = typeof q === "string" && q.trim() ? q.trim() : undefined;
  const members = await listMembers(gymId, search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">{members.length} total</p>
        </div>
        <Link href="/members/new" className={cn(buttonVariants(), "inline-flex shrink-0 text-center")}>
          Add member
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        <Input
          name="q"
          type="search"
          placeholder="Search name, email, phone…"
          defaultValue={search}
          className="flex-1"
          aria-label="Search members"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <ul className="flex flex-col gap-2">
        {members.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No members yet. Add your first member to get started.
          </li>
        ) : (
          members.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <p className="font-medium">{m.name}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                {m.email ? <span>{m.email}</span> : null}
                {m.phone ? <span>{m.phone}</span> : null}
                {!m.email && !m.phone ? <span>No contact</span> : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
