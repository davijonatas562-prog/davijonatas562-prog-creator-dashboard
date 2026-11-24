"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

export const HANDLE = "@davisantsofc";

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold">
        DS
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{HANDLE}</p>
        <p className="text-muted-foreground truncate text-xs">Painel de conteúdo</p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop */}
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r md:flex">
        <div className="border-sidebar-border border-b px-4 py-4">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("size-4", active && "text-primary")} />
                {item.title}
                {active && <span className="bg-primary ml-auto size-1.5 rounded-full" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-sidebar-border text-muted-foreground border-t p-4 text-xs">
          Última sync: hoje, 06:00
        </div>
      </aside>

      {/* Mobile: barra superior com navegação horizontal */}
      <header className="bg-sidebar border-sidebar-border sticky top-0 z-30 border-b md:hidden">
        <div className="px-4 py-3">
          <Brand />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs",
                  active ? "bg-sidebar-accent text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("size-3.5", active && "text-primary")} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
