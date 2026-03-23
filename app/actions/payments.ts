"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PaymentExceedsBalanceError } from "@/lib/services/membership-payment-summary";
import { createPayment, type PaymentMethodInput } from "@/lib/services/payments";

export type RecordPaymentState =
  | null
  | { ok: true; message: string }
  | { ok: false; error: string };

const METHODS: PaymentMethodInput[] = ["CASH", "CARD", "UPI", "OTHER"];

function formatInr(n: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export async function recordPaymentAction(
  _prev: RecordPaymentState,
  formData: FormData,
): Promise<RecordPaymentState> {
  const session = await auth();
  if (!session?.user?.gymId) {
    return { ok: false, error: "Not signed in" };
  }
  const gymId = session.user.gymId;

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const memberId = String(formData.get("memberId") ?? "").trim();
  const amountRaw = formData.get("amount");
  const methodRaw = String(formData.get("method") ?? "CASH").toUpperCase();
  const paidAtRaw = formData.get("paidAt");
  const referenceRaw = formData.get("reference");

  if (!membershipId || !memberId) {
    return { ok: false, error: "Missing membership or member." };
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, gymId, memberId },
    select: { id: true },
  });
  if (!membership) {
    return { ok: false, error: "Membership not found." };
  }

  const amount =
    typeof amountRaw === "string" ? Number.parseFloat(amountRaw.replace(",", ".")) : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid amount greater than zero." };
  }

  if (!METHODS.includes(methodRaw as PaymentMethodInput)) {
    return { ok: false, error: "Invalid payment method." };
  }

  let paidAt: Date;
  if (typeof paidAtRaw === "string" && paidAtRaw.trim()) {
    paidAt = new Date(paidAtRaw);
    if (Number.isNaN(paidAt.getTime())) {
      return { ok: false, error: "Invalid date or time." };
    }
  } else {
    paidAt = new Date();
  }

  const reference =
    referenceRaw === null || referenceRaw === "" ? null : String(referenceRaw).trim() || null;

  try {
    const { paymentSummary } = await createPayment(gymId, {
      membershipId,
      amount,
      paidAt,
      method: methodRaw as PaymentMethodInput,
      reference,
    });

    revalidatePath(`/members/${memberId}`);

    const remainingN = Number(paymentSummary.remaining);
    const msg = paymentSummary.isFullyPaid
      ? `Payment of ${formatInr(amount)} recorded. This membership is fully paid.`
      : `Payment of ${formatInr(amount)} recorded. Remaining: ${formatInr(remainingN)}.`;

    return { ok: true, message: msg };
  } catch (e) {
    if (e instanceof PaymentExceedsBalanceError) {
      const rem = Number(e.remaining);
      return {
        ok: false,
        error: `That amount is too high. You can pay at most ${formatInr(rem)} remaining (due ${formatInr(Number(e.amountDue))}, already paid ${formatInr(Number(e.paidTotal))}).`,
      };
    }
    const msg = e instanceof Error ? e.message : "Could not record payment.";
    return { ok: false, error: msg };
  }
}
