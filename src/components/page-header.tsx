import type { ReactNode } from "react";
import type { NavItem } from "@/lib/nav";

export function PageHeader({ item, actions }: { item: NavItem; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-lg">
          <item.icon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          <p className="text-muted-foreground text-sm">{item.description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
