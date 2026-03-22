export type ExpiryStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

const MS_PER_DAY = 86_400_000;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Expiry relative to "now" (default: current time). */
export function getExpiryStatus(endDate: Date, now: Date = new Date()): ExpiryStatus {
  const end = startOfUtcDay(endDate).getTime();
  const today = startOfUtcDay(now).getTime();
  if (end < today) return "EXPIRED";
  const daysLeft = Math.ceil((end - today) / MS_PER_DAY);
  if (daysLeft <= 7) return "EXPIRING_SOON";
  return "ACTIVE";
}
