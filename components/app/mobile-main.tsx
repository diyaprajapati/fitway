import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Single-column mobile width, bottom padding for fixed nav. */
export function MobileMain({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-md min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-4",
        className,
      )}
    >
      {children}
    </main>
  );
}
