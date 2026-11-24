"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, MapPin, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ProfileWithTerms } from "@/lib/types";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

export interface ProfilesActions {
  setStatus: (id: string, status: "active" | "paused") => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
}

export function ProfilesList({
  mode,
  base,
  profiles: initial,
  canEdit,
  limit,
  actions,
}: {
  mode: "app" | "demo";
  base: string;
  profiles: ProfileWithTerms[];
  canEdit: boolean;
  limit: number | null;
  actions?: ProfilesActions;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = React.useState(initial);
  const [toDelete, setToDelete] = React.useState<ProfileWithTerms | null>(null);
  const [pending, start] = React.useTransition();
  const isDemo = mode === "demo";
  React.useEffect(() => setProfiles(initial), [initial]);

  const atLimit = limit !== null && profiles.length >= limit;

  const toggle = (p: ProfileWithTerms) => {
    const status = p.status === "active" ? "paused" : "active";
    setProfiles((l) => l.map((x) => (x.id === p.id ? { ...x, status } : x)));
    if (isDemo || !actions) return toast.info("Na demonstração, as alterações não são salvas.");
    start(async () => {
      const r = await actions.setStatus(p.id, status);
      if (r.ok) toast.success(r.message);
      else {
        toast.error(r.error);
        setProfiles((l) => l.map((x) => (x.id === p.id ? { ...x, status: p.status } : x)));
      }
    });
  };

  const remove = () => {
    const p = toDelete;
    if (!p) return;
    if (isDemo || !actions) {
      setToDelete(null);
      return toast.info("Na demonstração, as alterações não são salvas.");
    }
    start(async () => {
      const r = await actions.remove(p.id);
      setToDelete(null);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Perfis monitorados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pessoas públicas acompanhadas pela organização
            {limit !== null && (
              <span className="tabular-nums">
                {" "}
                · {profiles.length} de {limit} no seu plano
              </span>
            )}
            .
          </p>
        </div>
        {canEdit && (
          <Button asChild={!atLimit} disabled={atLimit} title={atLimit ? "Limite do plano atingido." : undefined} className="w-full sm:w-auto">
            {atLimit ? (
              <span className="inline-flex items-center gap-2">
                <Plus /> Novo perfil
              </span>
            ) : (
              <Link href={`${base}/perfis/novo`}>
                <Plus /> Novo perfil
              </Link>
            )}
          </Button>
        )}
      </div>

      {profiles.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <UsersRound className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 text-base font-semibold">Cadastre o primeiro político</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Informe nome, cargo e município e escolha os termos de busca. Você pode testar os termos antes de salvar.
          </p>
          {canEdit ? (
            <Button asChild className="mt-6">
              <Link href={`${base}/perfis/novo`}>
                <Plus /> Adicionar político
              </Link>
            </Button>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">Peça a um administrador da organização para cadastrar.</p>
          )}
        </Card>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p, i) => {
            const counts = { primary: 0, related: 0, context: 0, exclude: 0 };
            p.terms.forEach((t) => (counts[t.kind] += 1));
            return (
              <li key={p.id} className="min-w-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 fill-mode-both" style={{ animationDelay: `${i * 40}ms` }}>
                <Card className={cn("flex h-full min-w-0 flex-col p-5 transition-colors hover:border-muted-foreground/30", p.status === "paused" && "opacity-75")}>
                  <div className="flex items-start gap-3">
                    <Avatar name={p.publicName} src={p.photoUrl} className="size-12 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="min-w-0 truncate font-semibold">{p.publicName}</p>
                        <Badge className="shrink-0" variant={p.status === "active" ? "positive" : "muted"}>{p.status === "active" ? "Ativo" : "Pausado"}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{p.fullName}</p>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {[p.office, p.municipality && `${p.municipality}${p.state ? ` – ${p.state}` : ""}`, p.party].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Ações de ${p.publicName}`} disabled={pending}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`${base}/perfis/${p.id}`}>
                              <Pencil /> Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggle(p)}>
                            {p.status === "active" ? <Pause /> : <Play />}
                            {p.status === "active" ? "Pausar monitoramento" : "Retomar monitoramento"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setToDelete(p)} className="text-negative focus:text-negative [&_svg]:!text-negative">
                            <Trash2 /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.terms
                      .filter((t) => t.kind === "primary")
                      .slice(0, 4)
                      .map((t) => (
                        <span key={t.term} className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          {t.term}
                        </span>
                      ))}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {counts.primary} principais · {counts.related} relacionados · {counts.context} de contexto · {counts.exclude} exclusões
                  </p>
                  <div className="mt-auto flex gap-2 pt-4">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`${base}?perfil=${p.id}`}>
                        <LayoutDashboard /> Dashboard
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`${base}/mencoes?perfil=${p.id}`}>Menções</Link>
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogTitle>Excluir {toDelete?.publicName}?</DialogTitle>
          <DialogDescription className="mt-1">
            O perfil, os termos e todas as menções e análises associadas serão apagados permanentemente. Para apenas interromper a coleta, use “Pausar monitoramento”.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              Excluir definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
