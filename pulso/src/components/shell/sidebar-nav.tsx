"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_NAV, CURRENT_PHASE, NAV, type NavItem } from "@/lib/nav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SidebarNav({ base, onNavigate, showAccount = true }: { base: string; onNavigate?: () => void; showAccount?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin" aria-label="Navegação principal">
      {NAV.map((group) => (
        <div key={group.label} className="grid gap-0.5">
          <p className="px-2.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">{group.label}</p>
          {group.items.map((item) => (
            <NavLink key={item.key} item={item} base={base} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
      {showAccount && (
        <div className="mt-auto grid gap-0.5">
          <p className="px-2.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">Conta</p>
          {ACCOUNT_NAV.map((item) => (
            <NavLink key={item.key} item={item} base={base} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </nav>
  );
}

function NavLink({ item, base, pathname, onNavigate }: { item: NavItem; base: string; pathname: string; onNavigate?: () => void }) {
  const href = `${base}${item.path}`;
  const active = item.path === "" ? pathname === base : pathname.startsWith(href);
  const Icon = item.icon;
  const available = item.phase <= CURRENT_PHASE;

  if (!available) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-disabled
            tabIndex={0}
            className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground/55 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <span className="shrink-0 rounded border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground/70">Fase {item.phase}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.description} Disponível na Fase {item.phase} do desenvolvimento.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-primary" aria-hidden />}
      <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "group-hover:text-foreground")} />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
