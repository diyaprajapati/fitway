import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseMemberFormConfig } from "@/lib/member-form-config";
import { normalizePhoneDigits } from "@/lib/phone";
import type { SanitizedMemberMeta } from "@/lib/public-register-meta";

function jsonToRecord(j: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (j == null || typeof j !== "object" || Array.isArray(j)) return {};
  return { ...(j as Record<string, unknown>) };
}

function mergeMeta(existing: Prisma.JsonValue | null | undefined, incoming: SanitizedMemberMeta): Prisma.InputJsonValue {
  const base = jsonToRecord(existing);
  const next = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(incoming)) {
    if (v !== undefined) {
      next[k] = v;
    }
  }
  return next as Prisma.InputJsonValue;
}

export type PublicRegisterOk = { memberId: string; created: boolean };
export type PublicRegisterErr = { error: "gym_not_found" | "invalid_phone" };
export type PublicRegisterResult = PublicRegisterOk | PublicRegisterErr;

/**
 * Upsert by (gymId + normalized phone). Updates name and merges meta for provided keys.
 */
export async function registerPublicMember(input: {
  gymId: string;
  name: string;
  email: string;
  phoneRaw: string;
  meta: SanitizedMemberMeta;
}): Promise<PublicRegisterResult> {
  const phone = normalizePhoneDigits(input.phoneRaw);
  if (!phone) return { error: "invalid_phone" };

  const gym = await prisma.gym.findUnique({
    where: { id: input.gymId },
    select: { id: true },
  });
  if (!gym) return { error: "gym_not_found" };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const metaPayload = input.meta;
  const hasMetaKeys = Object.values(metaPayload).some((v) => v !== undefined);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.member.findFirst({
        where: { gymId: input.gymId, phone },
        select: { id: true, meta: true },
      });

      if (existing) {
        await tx.member.update({
          where: { id: existing.id },
          data: {
            name,
            email,
            ...(hasMetaKeys ? { meta: mergeMeta(existing.meta, metaPayload) } : {}),
          },
        });
        return { memberId: existing.id, created: false };
      }

      const created = await tx.member.create({
        data: {
          gymId: input.gymId,
          name,
          phone,
          email,
          ...(hasMetaKeys ? { meta: mergeMeta(null, metaPayload) } : {}),
        },
        select: { id: true },
      });
      return { memberId: created.id, created: true };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.member.findFirst({
        where: { gymId: input.gymId, phone },
        select: { id: true, meta: true },
      });
      if (again) {
        await prisma.member.update({
          where: { id: again.id },
          data: {
            name,
            email,
            ...(hasMetaKeys ? { meta: mergeMeta(again.meta, metaPayload) } : {}),
          },
        });
        return { memberId: again.id, created: false };
      }
    }
    throw e;
  }
}

/** Load gym config for public register validation (single query). */
export async function getGymConfigForPublicRegister(gymId: string) {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, memberFormConfig: true },
  });
  if (!gym) return null;
  return { gymId: gym.id, formConfig: parseMemberFormConfig(gym.memberFormConfig) };
}
