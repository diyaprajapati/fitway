import type { Metadata } from "next";

import { getDashboardStats } from "@/lib/services/analytics";
import { requireGymSession } from "@/lib/server/gym-auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const { gymId } = await requireGymSession();
  const stats = await getDashboardStats(gymId);
  const revenue = Number(stats.revenueTotal);
  const revenueLabel = new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
    Number.isFinite(revenue) ? revenue : 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Overview of memberships and revenue.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active memberships" value={stats.activeMemberships} />
        <StatCard label="Expiring (7 days)" value={stats.expiringSoonMemberships} />
        <StatCard label="Expired" value={stats.expiredMemberships} />
        <StatCard label="Total revenue" value={revenueLabel} />
      </div>
    </div>
  );
}
