"use client";
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, initials } from "@/lib/utils";

function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <AvatarPrimitive.Root className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-border", className)}>
      {src ? <AvatarPrimitive.Image src={src} alt={name} className="aspect-square size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center bg-gradient-to-br from-primary/25 to-primary/5 text-[11px] font-semibold text-primary">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
export { Avatar };
