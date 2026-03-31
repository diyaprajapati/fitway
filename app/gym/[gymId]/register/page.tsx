import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GymRegisterForm } from "@/components/public/gym-register-form";
import { parseMemberFormConfig } from "@/lib/member-form-config";
import { getPublicGymSnapshot } from "@/lib/services/gym";

type Props = { params: Promise<{ gymId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gymId } = await params;
  const gym = await getPublicGymSnapshot(gymId);
  if (!gym) return { title: "Gym not found" };
  return { title: `Join ${gym.name}` };
}

export default async function GymRegisterPage({ params }: Props) {
  const { gymId } = await params;
  const gym = await getPublicGymSnapshot(gymId);

  if (!gym) {
    notFound();
  }

  const formConfig = parseMemberFormConfig(gym.memberFormConfig);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-background px-4 py-8 pb-12">
      <GymRegisterForm gymId={gym.id} gymName={gym.name} formConfig={formConfig} />
    </div>
  );
}
