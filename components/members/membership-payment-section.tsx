"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { recordPaymentAction, type RecordPaymentState } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Props = {
  membershipId: string;
  memberId: string;
  isFullyPaid: boolean;
  /** Max payable (remaining balance), for hint + input max */
  remaining: number;
  remainingLabel: string;
  defaultPaidAtLocal: string;
};

export function MembershipPaymentSection({
  membershipId,
  memberId,
  isFullyPaid,
  remaining,
  remainingLabel,
  defaultPaidAtLocal,
}: Props) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, null as RecordPaymentState);

  useEffect(() => {
    if (!state) return;
    const id = `pay-toast-${membershipId}`;
    if (state.ok) {
      toast.success(state.message, { id });
    } else {
      toast.error(state.error, { id });
    }
  }, [state, membershipId]);

  if (isFullyPaid) {
    return (
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground">Add payment</p>
        <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          Fully paid — no balance left for this membership.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">Add payment</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Up to <span className="font-medium text-foreground">{remainingLabel}</span> remaining.
      </p>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="membershipId" value={membershipId} />
        <input type="hidden" name="memberId" value={memberId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <Label htmlFor={`amount-${membershipId}`}>Amount (INR)</Label>
            <Input
              id={`amount-${membershipId}`}
              name="amount"
              type="number"
              required
              min={0.01}
              step={0.01}
              max={remaining > 0 ? remaining : undefined}
              placeholder="0.00"
              className="mt-1.5"
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor={`method-${membershipId}`}>Method</Label>
            <Select id={`method-${membershipId}`} name="method" required defaultValue="CASH" className="mt-1.5">
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
        </div>
        <div className="min-w-0">
          <Label htmlFor={`paidAt-${membershipId}`}>Paid at</Label>
          <Input
            id={`paidAt-${membershipId}`}
            name="paidAt"
            type="datetime-local"
            required
            defaultValue={defaultPaidAtLocal}
            className="mt-1.5"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor={`ref-${membershipId}`}>Reference (optional)</Label>
          <Input id={`ref-${membershipId}`} name="reference" placeholder="Txn ID, receipt no." className="mt-1.5" />
        </div>
        <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
          {pending ? "Recording…" : "Record payment"}
        </Button>
      </form>
    </div>
  );
}
