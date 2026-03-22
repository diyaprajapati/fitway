import { prisma } from "@/lib/db";
import { requireGymSession } from "@/lib/server/gym-auth";
import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileMain } from "@/components/app/mobile-main";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { gymId } = await requireGymSession();
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { name: true },
  });

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-background">
      <AppHeader gymName={gym?.name ?? "Your gym"} />
      <MobileMain>{children}</MobileMain>
      <BottomNav />
    </div>
  );
}
