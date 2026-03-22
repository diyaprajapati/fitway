import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "box-border max-w-full min-w-0 flex h-11 w-full cursor-pointer rounded-xl border border-input bg-background px-3 py-2 text-left text-base text-foreground shadow-sm transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        /* Longest option can force intrinsic min-width; cap width and ellipsize closed state where supported */
        "truncate overflow-hidden text-ellipsis whitespace-nowrap",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
