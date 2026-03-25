import { Prisma } from "@/generated/prisma/client";
import { parseCsv } from "@/lib/csv";
import { uniqueViolationMessage } from "@/lib/api/prisma-errors";
import { prisma } from "@/lib/db";
import {
  PaymentExceedsBalanceError,
} from "@/lib/services/membership-payment-summary";
import {
  createMemberWithMembershipAndOptionalPayment,
} from "@/lib/services/members";
import type { PaymentMethodInput } from "@/lib/services/payments";

const MAX_ROWS = 500;

const METHODS = new Set<string>(["CASH", "CARD", "UPI", "OTHER"]);

export type BulkImportRowResult = {
  rowNumber: number;
  ok: boolean;
  message: string;
  memberId?: string;
};

function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/** Map normalized CSV header to canonical field key. */
function canonicalField(normalized: string): string | null {
  const aliases: Record<string, string> = {
    name: "name",
    phone: "phone",
    email: "email",
    notes: "notes",
    plan_name: "plan_name",
    planname: "plan_name",
    membership_plan: "plan_name",
    plan: "plan_name",
    plan_id: "plan_id",
    planid: "plan_id",
    start_date: "start_date",
    startdate: "start_date",
    membership_start: "start_date",
    membership_starts: "start_date",
    payment_amount: "payment_amount",
    amount_paid: "payment_amount",
    paid_amount: "payment_amount",
    payment: "payment_amount",
    payment_date: "payment_date",
    paid_at: "payment_date",
    payment_method: "payment_method",
    method: "payment_method",
    payment_reference: "payment_reference",
    reference: "payment_reference",
    txn_reference: "payment_reference",
  };
  return aliases[normalized] ?? null;
}

function isValidCalendarUtc(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) return false;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Accepts YYYY-MM-DD, DD-MM-YYYY, or a string `Date` can parse (e.g. full ISO). */
function parseStartDate(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) {
    const [y, m, d] = t.split("-").map(Number);
    if (!isValidCalendarUtc(y, m, d)) return null;
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(t)) {
    const [day, month, y] = t.split("-").map(Number);
    if (!isValidCalendarUtc(y, month, day)) return null;
    return new Date(Date.UTC(y, month - 1, day, 12, 0, 0));
  }
  const parsed = new Date(t);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseMoney(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return null;
  const normalized = t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t.replace(",", "");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function rowToObject(
  headers: string[],
  cells: string[],
): Record<string, string> {
  const o: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    if (!key) continue;
    o[key] = cells[i] ?? "";
  }
  return o;
}

type PlanLookup = {
  byId: Map<string, true>;
  byLowerName: Map<string, string[]>;
};

async function buildActivePlanLookup(gymId: string): Promise<PlanLookup> {
  const plans = await prisma.plan.findMany({
    where: { gymId, active: true },
    select: { id: true, name: true },
  });
  const byId = new Map<string, true>();
  const byLowerName = new Map<string, string[]>();
  for (const p of plans) {
    byId.set(p.id, true);
    const k = p.name.trim().toLowerCase();
    if (!k) continue;
    const arr = byLowerName.get(k) ?? [];
    arr.push(p.id);
    byLowerName.set(k, arr);
  }
  return { byId, byLowerName };
}

function resolvePlanIdForRow(
  lookup: PlanLookup,
  planIdRaw: string,
  planNameRaw: string,
): { ok: true; planId: string } | { ok: false; message: string } {
  const idPart = planIdRaw.trim();
  const namePart = planNameRaw.trim();

  if (idPart) {
    if (!lookup.byId.has(idPart)) {
      return {
        ok: false,
        message: `plan_id "${idPart}" is not an active plan for your gym.`,
      };
    }
    return { ok: true, planId: idPart };
  }

  if (namePart) {
    const ids = lookup.byLowerName.get(namePart.toLowerCase()) ?? [];
    if (ids.length === 0) {
      return {
        ok: false,
        message: `No active plan named "${namePart}". Check spelling or the Plans tab.`,
      };
    }
    if (ids.length > 1) {
      return {
        ok: false,
        message: `More than one active plan is named "${namePart}". Rename one in Plans, or add a plan_id column.`,
      };
    }
    return { ok: true, planId: ids[0]! };
  }

  return { ok: false, message: "Missing plan_name (or plan_id)." };
}

export async function processBulkMemberImport(
  gymId: string,
  csvText: string,
): Promise<BulkImportRowResult[]> {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return [{ rowNumber: 1, ok: false, message: "File is empty or has no data rows." }];
  }

  const canonicalHeaders = table[0]!.map((h) => {
    const c = canonicalField(normalizeHeader(h));
    return c ?? `__drop_${normalizeHeader(h)}`;
  });

  const hasPlanKey =
    canonicalHeaders.includes("plan_name") || canonicalHeaders.includes("plan_id");

  if (!canonicalHeaders.includes("name") || !hasPlanKey) {
    return [
      {
        rowNumber: 1,
        ok: false,
        message:
          "Header row must include: name, start_date, and plan_name (plan_id is optional). See the template.",
      },
    ];
  }

  if (!canonicalHeaders.includes("start_date")) {
    return [
      {
        rowNumber: 1,
        ok: false,
        message: "Header row must include start_date.",
      },
    ];
  }

  const dataRows = table.slice(1);
  if (dataRows.length === 0) {
    return [{ rowNumber: 2, ok: false, message: "Add at least one data row below the header." }];
  }
  if (dataRows.length > MAX_ROWS) {
    return [
      {
        rowNumber: 0,
        ok: false,
        message: `Too many data rows (${dataRows.length}). Maximum per file is ${MAX_ROWS}.`,
      },
    ];
  }

  const results: BulkImportRowResult[] = [];
  const planLookup = await buildActivePlanLookup(gymId);

  let rowNumber = 2;
  for (const cells of dataRows) {
    const obj = rowToObject(canonicalHeaders, cells);
    const name = (obj.name ?? "").trim();
    const planIdRaw = (obj.plan_id ?? "").trim();
    const planNameRaw = (obj.plan_name ?? "").trim();
    const startRaw = (obj.start_date ?? "").trim();

    if (
      !name &&
      !planIdRaw &&
      !planNameRaw &&
      !startRaw &&
      !Object.values(obj).some((v) => v.trim() !== "")
    ) {
      rowNumber += 1;
      continue;
    }

    if (!name) {
      results.push({ rowNumber, ok: false, message: "Missing name." });
      rowNumber += 1;
      continue;
    }

    const resolved = resolvePlanIdForRow(planLookup, planIdRaw, planNameRaw);
    if (!resolved.ok) {
      results.push({ rowNumber, ok: false, message: resolved.message });
      rowNumber += 1;
      continue;
    }
    const planId = resolved.planId;

    if (!startRaw) {
      results.push({ rowNumber, ok: false, message: "Missing start_date." });
      rowNumber += 1;
      continue;
    }

    const startDate = parseStartDate(startRaw);
    if (!startDate) {
      results.push({
        rowNumber,
        ok: false,
        message: `Invalid start_date "${startRaw}". Use DD-MM-YYYY, YYYY-MM-DD, or a full ISO date.`,
      });
      rowNumber += 1;
      continue;
    }

    const notesRaw = (obj.notes ?? "").trim();
    const phoneRaw = (obj.phone ?? "").trim();
    const emailRaw = (obj.email ?? "").trim();

    const paymentAmountStr = (obj.payment_amount ?? "").trim();
    const amountN = paymentAmountStr ? parseMoney(paymentAmountStr) : null;
    if (paymentAmountStr && amountN === null) {
      results.push({
        rowNumber,
        ok: false,
        message: `Invalid payment_amount "${paymentAmountStr}".`,
      });
      rowNumber += 1;
      continue;
    }

    let payment:
      | {
          amount: number;
          paidAt: Date;
          method: PaymentMethodInput;
          reference?: string | null;
        }
      | null
      | undefined;

    if (amountN != null && amountN > 0) {
      const methodRaw = (obj.payment_method ?? "").trim().toUpperCase();
      if (!methodRaw) {
        results.push({
          rowNumber,
          ok: false,
          message: "payment_method is required when payment_amount is set.",
        });
        rowNumber += 1;
        continue;
      }
      if (!METHODS.has(methodRaw)) {
        results.push({
          rowNumber,
          ok: false,
          message: `Invalid payment_method "${methodRaw}". Use CASH, CARD, UPI, or OTHER.`,
        });
        rowNumber += 1;
        continue;
      }

      const paidAtRaw = (obj.payment_date ?? "").trim();
      const paidAt = paidAtRaw ? parseStartDate(paidAtRaw) : startDate;
      if (!paidAt) {
        results.push({
          rowNumber,
          ok: false,
          message: `Invalid payment_date "${paidAtRaw}". Use DD-MM-YYYY, YYYY-MM-DD, or ISO.`,
        });
        rowNumber += 1;
        continue;
      }

      const referenceRaw = (obj.payment_reference ?? "").trim();
      payment = {
        amount: amountN,
        paidAt,
        method: methodRaw as PaymentMethodInput,
        reference: referenceRaw || null,
      };
    } else {
      payment = undefined;
    }

    try {
      const { member } = await createMemberWithMembershipAndOptionalPayment(gymId, {
        name,
        phone: phoneRaw || null,
        email: emailRaw || null,
        notes: notesRaw || null,
        planId,
        startDate,
        payment,
      });
      results.push({
        rowNumber,
        ok: true,
        message: "Imported.",
        memberId: member.id,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        results.push({
          rowNumber,
          ok: false,
          message: uniqueViolationMessage(e),
        });
      } else if (e instanceof PaymentExceedsBalanceError) {
        results.push({
          rowNumber,
          ok: false,
          message: e.message,
        });
      } else {
        const msg = e instanceof Error ? e.message : "Failed";
        if (msg === "Plan not found") {
          results.push({
            rowNumber,
            ok: false,
            message: "Plan not found or inactive. Use an active plan name or plan_id.",
          });
        } else {
          results.push({ rowNumber, ok: false, message: msg });
        }
      }
    }

    rowNumber += 1;
  }

  if (results.length === 0 && dataRows.length > 0) {
    return [{ rowNumber: 2, ok: false, message: "No valid data rows were processed." }];
  }

  return results;
}
