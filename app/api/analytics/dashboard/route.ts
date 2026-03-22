import { requireGymSession } from "@/lib/api/session";
import { jsonError, jsonOk } from "@/lib/api/json";
import { getDashboardStats } from "@/lib/services/analytics";

export async function GET(req: Request) {
  const auth = await requireGymSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("revenueFrom");
  const to = searchParams.get("revenueTo");

  let revenueRange: { from: Date; to: Date } | undefined;
  if (from && to) {
    const dFrom = new Date(from);
    const dTo = new Date(to);
    if (Number.isNaN(dFrom.getTime()) || Number.isNaN(dTo.getTime())) {
      return jsonError("Invalid revenueFrom / revenueTo", 400);
    }
    revenueRange = { from: dFrom, to: dTo };
  }

  const stats = await getDashboardStats(auth.session.gymId, revenueRange);
  return jsonOk(stats);
}
