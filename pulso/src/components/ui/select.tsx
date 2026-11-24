import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Select nativo estilizado — acessível e ótimo no mobile. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-10 w-full appearance-none rounded-md border border-input bg-background/60 pl-3 pr-9 text-sm outline-none transition-[box-shadow,border-color] focus-visible:border-primary/70 focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:opacity-50 [color-scheme:dark]"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
export { NativeSelect };
