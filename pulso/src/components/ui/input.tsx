import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-md border border-input bg-background/60 px-3 py-2 text-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-primary/70 focus-visible:ring-[3px] focus-visible:ring-primary/15",
        "aria-invalid:border-negative/70 aria-invalid:ring-negative/15",
        "[color-scheme:dark]",
        className,
      )}
      {...props}
    />
  );
}
export { Input };
