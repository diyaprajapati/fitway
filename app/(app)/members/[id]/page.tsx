import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { batchPaymentSummariesForMemberships } from "@/lib/services/membership-payment-summary";
import { getMemberDetail } from "@/lib/services/members";
import { requireGymSession } from "@/lib/server/gym-auth";
import { getExpiryStatus } from "@/lib/utils/expiry";

type PageProps = { params: Promise<{ id: string }> };

function formatMoney(amount: { toString(): string }) {
  const n = Number(amount.toString());
  return formatInr(n);
}

function formatInr(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
    Number.isFinite(n) ? n : 0,
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(d);
}

function statusLabel(status: ReturnType<typeof getExpiryStatus>) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "EXPIRING_SOON":
      return "Expiring soon";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}

function statusClass(status: ReturnType<typeof getExpiryStatus>) {
  switch (status) {
    case "ACTIVE":
      return "bg-primary/15 text-primary";
    case "EXPIRING_SOON":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "EXPIRED":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted";
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.gymId) return { title: "Member" };
  const member = await getMemberDetail(session.user.gymId, id);
  if (!member) return { title: "Member" };
  return { title: member.name };
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { gymId } = await requireGymSession();
  const member = await getMemberDetail(gymId, id);
  if (!member) notFound();

  const summaries = await batchPaymentSummariesForMemberships(member.memberships);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground">
          ← Members
        </Link>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{member.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Member since {formatDate(member.createdAt)}</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-right font-medium">{member.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-right font-medium">{member.phone ?? "—"}</dd>
          </div>
        </dl>
      </section>

      {member.notes ? (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{member.notes}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Memberships</h3>
        {member.memberships.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No memberships yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {member.memberships.map((m) => {
              const expiry = getExpiryStatus(m.endDate, now);
              const summary = summaries.get(m.id);
              return (
                <li
                  key={m.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.plan.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(m.startDate)} → {formatDate(m.endDate)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(expiry)}`}
                    >
                      {statusLabel(expiry)}
                    </span>
                  </div>

                  {summary ? (
                    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Due</dt>
                        <dd className="mt-0.5 font-medium tabular-nums">{formatInr(Number(summary.amountDue))}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Paid</dt>
                        <dd className="mt-0.5 font-medium tabular-nums">{formatInr(Number(summary.paidTotal))}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Remaining</dt>
                        <dd className="mt-0.5 font-medium tabular-nums">{formatInr(Number(summary.remaining))}</dd>
                      </div>
                    </dl>
                  ) : null}

                  {m.payments.length > 0 ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground">Payments</p>
                      <ul className="mt-2 space-y-2">
                        {m.payments.map((p) => (
                          <li
                            key={p.id}
                            className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                          >
                            <span className="font-medium tabular-nums">{formatMoney(p.amount)}</span>
                            <span className="text-muted-foreground">
                              {p.method} · {formatDate(p.paidAt)}
                            </span>
                            {p.reference ? (
                              <span className="w-full text-xs text-muted-foreground">Ref: {p.reference}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
