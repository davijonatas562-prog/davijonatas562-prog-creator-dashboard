"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, CheckCircle2, ChevronDown, CircleAlert, CircleDashed, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/metrics/period";
import { SOURCE_BY_ID } from "@/lib/connectors/catalog";
import type { MonitoredProfile, SourceStatus } from "@/lib/types";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { dateTime, relativeTime } from "./format";

export function DashboardHeader({
  profiles,
  profileId,
  periodKey,
  from,
  to,
  sources,
  lastUpdated,
  onRefresh,
  pending,
  navigate,
}: {
  profiles: MonitoredProfile[];
  profileId: string | null;
  periodKey: PeriodKey;
  from: string;
  to: string;
  sources: SourceStatus[];
  lastUpdated: string | null;
  onRefresh: () => Promise<ActionResult>;
  pending: boolean;
  navigate: (params: Record<string, string | null>) => void;
}) {
  const profile = profiles.find((p) => p.id === profileId) ?? null;
  const [customOpen, setCustomOpen] = React.useState(periodKey === "custom");
  const [range, setRange] = React.useState({ from, to });
  const [refreshing, startRefresh] = React.useTransition();
  const router = useRouter();

  React.useEffect(() => setRange({ from, to }), [from, to]);

  const refresh = () =>
    startRefresh(async () => {
      const r = await onRefresh();
      if (r.ok) {
        toast.success(r.message ?? "Monitoramento atualizado.");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="group flex min-w-0 items-center gap-3 rounded-lg p-1 pr-2 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/40">
                <Avatar name={profile.publicName} src={profile.photoUrl} className="size-11 text-sm" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-xl font-semibold tracking-tight">{profile.publicName}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[profile.office, profile.municipality && `${profile.municipality}${profile.state ? ` – ${profile.state}` : ""}`, profile.party]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>Perfis monitorados</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={profile.id} onValueChange={(id) => navigate({ perfil: id })}>
                  {profiles.map((p) => (
                    <DropdownMenuRadioItem key={p.id} value={p.id}>
                      <span className="min-w-0 flex-1 truncate">{p.publicName}</span>
                      {p.status === "paused" && <span className="text-[10px] text-muted-foreground">pausado</span>}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SourcesMenu sources={sources} />
          <span className="hidden text-xs text-muted-foreground sm:inline" title={lastUpdated ? dateTime(lastUpdated) : undefined}>
            {lastUpdated ? `Atualizado ${relativeTime(lastUpdated)}` : "Nunca sincronizado"}
          </span>
          <Button onClick={refresh} disabled={refreshing || pending} size="sm" className="h-9">
            <RefreshCw className={cn(refreshing && "animate-spin")} />
            {refreshing ? "Atualizando…" : "Atualizar monitoramento"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full overflow-x-auto rounded-lg border border-border bg-card/60 p-0.5 scrollbar-thin sm:w-auto" role="tablist" aria-label="Período analisado">
          {PERIOD_OPTIONS.map((p) => {
            const active = p.key === periodKey;
            return (
              <button
                key={p.key}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => {
                  if (p.key === "custom") setCustomOpen(true);
                  else {
                    setCustomOpen(false);
                    navigate({ periodo: p.key, de: null, ate: null });
                  }
                }}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:flex-none",
                  active || (p.key === "custom" && customOpen) ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.key === "custom" && <CalendarRange className="mr-1 inline size-3.5 -translate-y-px" />}
                {p.short}
              </button>
            );
          })}
        </div>
        {customOpen && (
          <form
            className="flex flex-wrap items-center gap-2 animate-in fade-in-0 slide-in-from-left-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!range.from || !range.to || range.to < range.from) {
                toast.error("Escolha um intervalo válido: a data final precisa ser igual ou posterior à inicial.");
                return;
              }
              navigate({ periodo: "custom", de: range.from, ate: range.to });
            }}
          >
            <Input type="date" aria-label="Data inicial" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="h-9 w-[150px]" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" aria-label="Data final" value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="h-9 w-[150px]" />
            <Button type="submit" size="sm" variant="secondary" className="h-9">
              Aplicar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function SourcesMenu({ sources }: { sources: SourceStatus[] }) {
  const connected = sources.filter((s) => s.status === "connected").length;
  const errors = sources.filter((s) => s.status === "error").length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card/60 px-3 text-xs font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40">
        <span className="relative flex size-2">
          {connected > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />}
          <span className={cn("relative inline-flex size-2 rounded-full", connected > 0 ? "bg-positive" : "bg-muted-foreground")} />
        </span>
        {connected} de {sources.length || 11} fontes
        {errors > 0 && <span className="rounded bg-negative/15 px-1.5 py-px text-[10px] text-negative">{errors} com erro</span>}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium">Status das fontes</p>
          <p className="text-[11px] text-muted-foreground">Somente fontes públicas e APIs autorizadas.</p>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1 scrollbar-thin">
          {sources.map((s) => {
            const Icon = s.status === "connected" ? CheckCircle2 : s.status === "error" ? CircleAlert : CircleDashed;
            return (
              <li key={s.sourceId} className="flex items-start gap-2.5 rounded-md px-2 py-2 text-xs">
                <Icon
                  className={cn(
                    "mt-px size-4 shrink-0",
                    s.status === "connected" ? "text-positive" : s.status === "error" ? "text-negative" : "text-muted-foreground/60",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{SOURCE_BY_ID[s.sourceId]?.name ?? s.sourceId}</span>
                    <span className="tabular-nums text-muted-foreground">{s.status === "not_connected" ? "" : `${s.mentionsFound.toLocaleString("pt-BR")} menções`}</span>
                  </div>
                  <p className={cn("mt-0.5 text-[11px]", s.status === "error" ? "text-negative" : "text-muted-foreground")}>
                    {s.status === "connected"
                      ? s.lastSyncedAt
                        ? `Sincronizado ${relativeTime(s.lastSyncedAt)}`
                        : "Conectado"
                      : s.status === "error"
                        ? (s.lastError ?? "Erro de integração")
                        : s.status === "paused"
                          ? "Pausado"
                          : "Não conectado"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <DropdownMenuSeparator className="m-0" />
        <p className="px-3 py-2 text-[11px] text-muted-foreground">A configuração de conectores chega na Fase 3.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Atualiza a URL preservando os demais parâmetros. */
export function useDashboardNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = React.useTransition();
  const navigate = React.useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null) sp.delete(k);
        else sp.set(k, v);
      }
      start(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );
  return { navigate, pending };
}
