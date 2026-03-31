import type { Metadata } from "next";

import { MemberFormSettings } from "@/components/settings/member-form-settings";
import { parseMemberFormConfig } from "@/lib/member-form-config";
import { prisma } from "@/lib/db";
import { requireGymSession } from "@/lib/server/gym-auth";

export const metadata: Metadata = {
  title: "Registration form",
};

export default async function MemberFormSettingsPage() {
  const { gymId } = await requireGymSession();
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { memberFormConfig: true },
  });

  const initial = parseMemberFormConfig(gym?.memberFormConfig);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Public registration form</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which extra fields appear on <span className="font-mono text-xs">/gym/…/register</span>. Name and phone
          are always shown. Your member QR link does not change when you edit this.
        </p>
      </div>

      <MemberFormSettings initial={initial} />
    </div>
  );
}
