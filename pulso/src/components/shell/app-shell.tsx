"use client";

import * as React from "react";
import Link from "next/link";
import { FlaskConical, LogOut, Menu } from "lucide-react";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrgSwitcher, type OrgOption } from "./org-switcher";

export interface ShellUser {
  name: string;
  email: string;
}

export function AppShell({
  mode,
  user,
  orgs,
  currentOrgId,
  children,
}: {
  mode: "app" | "demo";
  user: ShellUser | null;
  orgs: OrgOption[];
  currentOrgId: string | null;
  children: React.ReactNode;
}) {
  const base = mode === "demo" ? "/demo" : "/painel";
  const [open, setOpen] = React.useState(false);

  const orgBlock =
    mode === "demo" ? (
      <div className="mx-3 mt-3 rounded-lg border border-border bg-card/60 px-3 py-2.5">
        <p className="text-[11px] text-muted-foreground">Organização</p>
        <p className="truncate text-sm font-medium">Equipe de Demonstração</p>
      </div>
    ) : (
      <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} />
    );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-dvh">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
          <div className="flex h-14 items-center px-5">
            <Logo href={base} />
          </div>
          {orgBlock}
          <SidebarNav base={base} showAccount={mode === "app"} />
          <SidebarFooter mode={mode} user={user} base={base} />
        </aside>

        {/* Sidebar mobile */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent side="left" className="flex flex-col bg-sidebar p-0" aria-describedby={undefined}>
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <div className="flex h-14 items-center px-5">
              <Logo href={base} />
            </div>
            {orgBlock}
            <SidebarNav base={base} onNavigate={() => setOpen(false)} showAccount={mode === "app"} />
            <SidebarFooter mode={mode} user={user} base={base} />
          </DialogContent>
        </Dialog>

        <div className="flex min-w-0 flex-1 flex-col">
          {mode === "demo" && <DemoBanner />}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu />
            </Button>
            <Logo href={base} />
          </header>
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function DemoBanner() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 border-b border-info/25 bg-info/10 px-4 py-2 text-center text-xs text-info">
      <FlaskConical className="size-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">Ambiente de demonstração.</strong> Os dados apresentados são fictícios.
      </span>
      <Link href="/cadastro" className="ml-1 hidden font-medium underline underline-offset-2 hover:text-foreground sm:inline">
        Criar conta real
      </Link>
    </div>
  );
}

function SidebarFooter({ mode, user, base }: { mode: "app" | "demo"; user: ShellUser | null; base: string }) {
  if (mode === "demo" || !user) {
    return (
      <div className="border-t border-sidebar-border p-3">
        <Button asChild className="w-full">
          <Link href="/cadastro">Criar conta</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-1 w-full">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40">
          <Avatar name={user.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{user.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`${base}/conta`}>Minha conta</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}/organizacao`}>Organização</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/demo">Ver demonstração</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action="/auth/sair" method="post">
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                <LogOut />
                Sair
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
