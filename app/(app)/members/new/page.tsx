import type { Metadata } from "next";
import Link from "next/link";

import { MemberNewForm } from "@/components/members/member-new-form";
import { listPlans } from "@/lib/services/plans";
import { requireGymSession } from "@/lib/server/gym-auth";

export const metadata: Metadata = {
  title: "New member",
};

function formatMoney(amount: { toString(): string }) {
  const n = Number(amount.toString());
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export default async function NewMemberPage() {
  const { gymId } = await requireGymSession();
  const plans = await listPlans(gymId, true);
  const planOptions = plans.map((p) => ({
    id: p.id,
    name: p.name,
    durationDays: p.durationDays,
    priceLabel: formatMoney(p.price),
  }));
  const defaultStartDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground">
          ← Members
        </Link>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">New member</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a plan and start date; we&apos;ll create their membership automatically.
        </p>
      </div>
      <MemberNewForm plans={planOptions} defaultStartDate={defaultStartDate} />
    </div>
  );
}
