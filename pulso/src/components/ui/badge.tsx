import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/10 text-primary",
        outline: "border-border text-muted-foreground",
        positive: "border-positive/30 bg-positive/10 text-positive",
        negative: "border-negative/30 bg-negative/10 text-negative",
        info: "border-info/30 bg-info/10 text-info",
        warning: "border-warning/30 bg-warning/10 text-warning",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
