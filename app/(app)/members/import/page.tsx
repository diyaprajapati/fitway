import type { Metadata } from "next";
import Link from "next/link";

import { MemberBulkImport } from "@/components/members/member-bulk-import";
import { listPlans } from "@/lib/services/plans";
import { requireGymSession } from "@/lib/server/gym-auth";

export const metadata: Metadata = {
  title: "Import CSV",
};

export default async function ImportMembersCsvPage() {
  const { gymId } = await requireGymSession();
  const planHints = await listPlans(gymId, true);
  const bulkPlans = planHints.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground">
          ← Members
        </Link>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Import CSV</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a file to add many members with their first membership and an optional payment.
        </p>
      </div>
      <MemberBulkImport plans={bulkPlans} />
    </div>
  );
}
