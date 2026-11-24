"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilterX,
  LinkIcon,
  Loader2,
  MessagesSquare,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SOURCES, sourceName } from "@/lib/connectors/catalog";
import {
  CONTENT_TYPE_LABEL,
  SENTIMENT_LABEL,
  STANCE_LABEL,
  STATUS_LABEL,
  type MentionItem,
  type MentionStatus,
  type MonitoredProfile,
  type Sentiment,
} from "@/lib/types";
import type { ActionResult } from "@/lib/action-result";
import { PERIOD_OPTIONS } from "@/lib/metrics/period";
import { cn, formatCompact } from "@/lib/utils";
import { SENTIMENT_STYLE, dateTime, relativeTime } from "@/components/dashboard/format";
import { ManualMentionDialog } from "./manual-mention-dialog";

export interface FeedActions {
  setStatus: (id: string, status: string) => Promise<ActionResult>;
  toggleSaved: (id: string, save: boolean) => Promise<ActionResult>;
  correct: (id: string, sentiment: string) => Promise<ActionResult>;
  addManual: (input: unknown) => Promise<ActionResult>;
  classify: (profileId: string) => Promise<ActionResult>;
}

const DEMO_NOTE = "Na demonstração, as alterações não são salvas.";

export function MentionsFeed({
  mode,
  items: initialItems,
  total,
  page,
  pageSize,
  topics,
  profiles,
  profileId,
  unclassified,
  canWork,
  aiConfigured,
  actions,
}: {
  mode: "app" | "demo";
  items: MentionItem[];
  total: number;
  page: number;
  pageSize: number;
  topics: string[];
  profiles: MonitoredProfile[];
  profileId: string;
  unclassified: number;
  canWork: boolean;
  aiConfigured: boolean;
  actions?: FeedActions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startNav] = React.useTransition();
  const [classifying, startClassify] = React.useTransition();
  const [items, setItems] = React.useState(initialItems);
  const [detail, setDetail] = React.useState<MentionItem | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const isDemo = mode === "demo";

  React.useEffect(() => setItems(initialItems), [initialItems]);

  const navigate = React.useCallback(
    (next: Record<string, string | null>, resetPage = true) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      if (resetPage && !("pagina" in next)) sp.delete("pagina");
      startNav(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  // busca com atraso para não navegar a cada tecla
  React.useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => navigate({ q: q.trim() || null }), 400);
    return () => clearTimeout(t);
  }, [q, params, navigate]);

  const patch = (id: string, fn: (m: MentionItem) => MentionItem) => {
    setItems((list) => list.map((m) => (m.id === id ? fn(m) : m)));
    setDetail((d) => (d && d.id === id ? fn(d) : d));
  };

  const run = async (fn: () => Promise<ActionResult>, optimistic: () => void, rollback: () => void) => {
    optimistic();
    if (isDemo || !actions) {
      toast.info(DEMO_NOTE);
      return;
    }
    const r = await fn();
    if (!r.ok) {
      rollback();
      toast.error(r.error);
    } else if (r.message) toast.success(r.message);
  };

  const onStatus = (m: MentionItem, status: MentionStatus) =>
    run(
      () => actions!.setStatus(m.id, status),
      () => patch(m.id, (x) => ({ ...x, status })),
      () => patch(m.id, (x) => ({ ...x, status: m.status })),
    );
  const onSave = (m: MentionItem) =>
    run(
      () => actions!.toggleSaved(m.id, !m.saved),
      () => patch(m.id, (x) => ({ ...x, saved: !m.saved })),
      () => patch(m.id, (x) => ({ ...x, saved: m.saved })),
    );
  const onCorrect = (m: MentionItem, sentiment: Sentiment) =>
    run(
      () => actions!.correct(m.id, sentiment),
      () =>
        patch(m.id, (x) => ({
          ...x,
          analysis: {
            ...(x.analysis ?? { emotion: null, stance: "unknown", irony: false, sarcasm: false, context: null, model: null }),
            sentiment,
            confidence: 1,
            isManual: true,
          },
        })),
      () => patch(m.id, (x) => ({ ...x, analysis: m.analysis })),
    );

  const classify = () =>
    startClassify(async () => {
      if (isDemo || !actions) {
        toast.info("Na demonstração, a análise já vem pronta. Na conta real, a IA classifica as menções pendentes.");
        return;
      }
      const r = await actions.classify(profileId);
      if (r.ok) {
        toast.success(r.message ?? "Classificação concluída.");
        router.refresh();
      } else toast.error(r.error);
    });

  const get = (k: string) => params.get(k) ?? "";
  const hasFilters = ["rede", "sentimento", "assunto", "relevancia", "tipo", "status", "salvas", "q", "de", "ate"].some((k) => params.get(k));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const profile = profiles.find((p) => p.id === profileId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Menções</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tudo o que foi encontrado sobre{" "}
            {profiles.length > 1 ? (
              <select
                aria-label="Perfil"
                value={profileId}
                onChange={(e) => navigate({ perfil: e.target.value })}
                className="rounded border border-border bg-card px-1.5 py-0.5 text-foreground [color-scheme:dark]"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.publicName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-foreground">{profile?.publicName}</span>
            )}{" "}
            nas fontes monitoradas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unclassified > 0 && (
            <Button variant="outline" onClick={classify} disabled={classifying || !canWork || (!isDemo && !aiConfigured)} title={!aiConfigured && !isDemo ? "Configure ANTHROPIC_API_KEY para usar a IA." : undefined}>
              {classifying ? <Loader2 className="animate-spin" /> : <Sparkles className="text-primary" />}
              Classificar {unclassified} pendente{unclassified > 1 ? "s" : ""}
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)} disabled={!canWork}>
            <Plus /> Registrar menção
          </Button>
        </div>
      </div>

      {!isDemo && !aiConfigured && (
        <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          A análise de sentimento por IA não está configurada neste servidor (ANTHROPIC_API_KEY). As menções ficam “não classificadas” até lá; a correção manual funciona normalmente.
        </p>
      )}

      {/* Filtros */}
      <Card className="grid gap-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por palavra-chave ou autor…" className="pl-9" aria-label="Buscar menções" />
          </div>
          <div className="flex gap-2">
            <NativeSelect aria-label="Ordenar" value={get("ordem") || "recentes"} onChange={(e) => navigate({ ordem: e.target.value === "recentes" ? null : e.target.value })} className="w-40">
              <option value="recentes">Mais recentes</option>
              <option value="relevancia">Mais relevantes</option>
              <option value="alcance">Maior alcance</option>
            </NativeSelect>
            <Button
              type="button"
              variant={get("salvas") ? "secondary" : "outline"}
              onClick={() => navigate({ salvas: get("salvas") ? null : "1" })}
              aria-pressed={!!get("salvas")}
              className="h-10"
            >
              <BookmarkCheck className={cn(get("salvas") && "text-primary")} /> Salvas
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <NativeSelect aria-label="Período" value={get("periodo") || "30d"} onChange={(e) => navigate({ periodo: e.target.value, de: null, ate: null })}>
            {PERIOD_OPTIONS.filter((p) => p.key !== "custom").map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Rede social" value={get("rede")} onChange={(e) => navigate({ rede: e.target.value })}>
            <option value="">Todas as redes</option>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Sentimento" value={get("sentimento")} onChange={(e) => navigate({ sentimento: e.target.value })}>
            <option value="">Todos os sentimentos</option>
            {(Object.keys(SENTIMENT_LABEL) as Sentiment[]).map((s) => (
              <option key={s} value={s}>
                {SENTIMENT_LABEL[s]}
              </option>
            ))}
            <option value="unclassified">Não classificada</option>
          </NativeSelect>
          <NativeSelect aria-label="Assunto" value={get("assunto")} onChange={(e) => navigate({ assunto: e.target.value })}>
            <option value="">Todos os assuntos</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Relevância" value={get("relevancia")} onChange={(e) => navigate({ relevancia: e.target.value })}>
            <option value="">Qualquer relevância</option>
            <option value="0.8">Alta</option>
            <option value="0.6">Média ou alta</option>
          </NativeSelect>
          <NativeSelect aria-label="Tipo de conteúdo" value={get("tipo")} onChange={(e) => navigate({ tipo: e.target.value })}>
            <option value="">Todos os tipos</option>
            {Object.entries(CONTENT_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Status" value={get("status")} onChange={(e) => navigate({ status: e.target.value })}>
            <option value="">Qualquer status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {total.toLocaleString("pt-BR")} {total === 1 ? "menção encontrada" : "menções encontradas"}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                startNav(() => router.push(`${pathname}${params.get("perfil") ? `?perfil=${params.get("perfil")}` : ""}`, { scroll: false }));
              }}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <FilterX className="size-3.5" /> Limpar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Lista */}
      {pending ? (
        <div className="grid gap-3" aria-busy>
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
              <Skeleton className="mt-4 h-3 w-64" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyFeed filtered={hasFilters} isDemo={isDemo} onAdd={() => setAddOpen(true)} canWork={canWork} />
      ) : (
        <ul className="grid gap-3">
          {items.map((m, i) => (
            <MentionCard
              key={m.id}
              m={m}
              index={i}
              isDemo={isDemo}
              canWork={canWork}
              onOpen={() => setDetail(m)}
              onSave={() => onSave(m)}
              onStatus={(s) => onStatus(m, s)}
              onCorrect={(s) => onCorrect(m, s)}
            />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Paginação">
          <Button variant="outline" size="sm" disabled={page <= 1 || pending} onClick={() => navigate({ pagina: String(page - 1) }, false)}>
            <ChevronLeft /> Anterior
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Página {page} de {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages || pending} onClick={() => navigate({ pagina: String(page + 1) }, false)}>
            Próxima <ChevronRight />
          </Button>
        </nav>
      )}

      <MentionDetail m={detail} isDemo={isDemo} onClose={() => setDetail(null)} />
      <ManualMentionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        profileId={profileId}
        isDemo={isDemo}
        onSubmit={async (v) => {
          if (isDemo || !actions) {
            toast.info("Na demonstração não é possível registrar menções. Crie uma conta para usar com dados reais.");
            return false;
          }
          const r = await actions.addManual(v);
          if (r.ok) {
            toast.success(r.message ?? "Menção registrada.");
            router.refresh();
            return true;
          }
          toast.error(r.error);
          return false;
        }}
      />
    </div>
  );
}

function relevanceLabel(r: number) {
  return r >= 0.8 ? "Alta" : r >= 0.6 ? "Média" : "Baixa";
}

function MentionCard({
  m,
  index,
  isDemo,
  canWork,
  onOpen,
  onSave,
  onStatus,
  onCorrect,
}: {
  m: MentionItem;
  index: number;
  isDemo: boolean;
  canWork: boolean;
  onOpen: () => void;
  onSave: () => void;
  onStatus: (s: MentionStatus) => void;
  onCorrect: (s: Sentiment) => void;
}) {
  const a = m.analysis;
  const s = a ? SENTIMENT_STYLE[a.sentiment] : null;
  return (
    <li
      className="group animate-in fade-in-0 slide-in-from-bottom-1 duration-300 fill-mode-both"
      style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
    >
      <Card className={cn("relative overflow-hidden p-4 transition-colors hover:border-muted-foreground/30", m.status === "ignored" && "opacity-60")}>
        {a && <span className={cn("absolute inset-y-0 left-0 w-[3px]", s?.dot)} aria-hidden />}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/90">{sourceName(m.sourceId)}</span>
          <span>·</span>
          <span>{CONTENT_TYPE_LABEL[m.contentType]}</span>
          <span>·</span>
          <time dateTime={m.publishedAt} title={dateTime(m.publishedAt)}>
            {relativeTime(m.publishedAt)}
          </time>
          {m.authorName && (
            <>
              <span>·</span>
              <span className="truncate">{m.authorName}</span>
            </>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            {m.status !== "new" && <Badge variant="outline">{STATUS_LABEL[m.status]}</Badge>}
            {a ? (
              <Badge variant={s!.badge} title={a.isManual ? "Corrigida manualmente" : `Confiança ${Math.round(a.confidence * 100)}%`}>
                {a.isManual && <PencilLine />}
                {SENTIMENT_LABEL[a.sentiment]}
              </Badge>
            ) : (
              <Badge variant="outline">Não classificada</Badge>
            )}
          </span>
        </div>

        <button type="button" onClick={onOpen} className="mt-2.5 block w-full text-left">
          <p className="line-clamp-4 text-[14px] leading-relaxed text-foreground/95 group-hover:text-foreground">{m.content}</p>
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          {m.topic && <span className="rounded bg-muted px-1.5 py-0.5 text-foreground/80">{m.topic}</span>}
          <span>Relevância {relevanceLabel(m.relevance).toLowerCase()}</span>
          {m.reach !== null && <span className="tabular-nums">alcance ~{formatCompact(m.reach)}</span>}
          {m.engagement !== null && <span className="tabular-nums">{formatCompact(m.engagement)} interações</span>}
          {a?.irony && <Badge variant="warning">{a.sarcasm ? "Sarcasmo" : "Ironia"}</Badge>}

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onSave} aria-pressed={m.saved} title={m.saved ? "Remover das salvas" : "Salvar menção"}>
              {m.saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
              <span className="hidden sm:inline">{m.saved ? "Salva" : "Salvar"}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={!canWork}>
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Marcar como</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={m.status} onValueChange={(v) => onStatus(v as MentionStatus)}>
                  {(Object.keys(STATUS_LABEL) as MentionStatus[]).map((k) => (
                    <DropdownMenuRadioItem key={k} value={k}>
                      {STATUS_LABEL[k]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={!canWork} title="Corrigir sentimento">
                  <PencilLine />
                  <span className="hidden sm:inline">Corrigir</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sentimento correto</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={a?.sentiment} onValueChange={(v) => onCorrect(v as Sentiment)}>
                  {(Object.keys(SENTIMENT_LABEL) as Sentiment[]).map((k) => (
                    <DropdownMenuRadioItem key={k} value={k}>
                      {SENTIMENT_LABEL[k]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {m.url ? (
              <Button asChild variant="ghost" size="sm">
                <a href={m.url} target="_blank" rel="noopener noreferrer nofollow" title="Abrir publicação original">
                  <ExternalLink />
                  <span className="hidden sm:inline">Original</span>
                </a>
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 text-[11px] text-muted-foreground/70" title={isDemo ? "Menção fictícia: não existe publicação original." : "A fonte não informou o link."}>
                <LinkIcon className="size-3" /> {isDemo ? "fictícia" : "sem link"}
              </span>
            )}
          </div>
        </div>
      </Card>
    </li>
  );
}

function MentionDetail({ m, isDemo, onClose }: { m: MentionItem | null; isDemo: boolean; onClose: () => void }) {
  const a = m?.analysis;
  return (
    <Dialog open={!!m} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {m && (
          <>
            <DialogTitle>Menção em {sourceName(m.sourceId)}</DialogTitle>
            <DialogDescription className="mt-1">
              {dateTime(m.publishedAt)}
              {m.authorName ? ` · ${m.authorName}` : ""} · {CONTENT_TYPE_LABEL[m.contentType]}
            </DialogDescription>
            <blockquote className="mt-5 whitespace-pre-wrap rounded-lg border border-border bg-background/60 p-4 text-sm leading-relaxed">{m.content}</blockquote>

            <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" /> Análise
              {a?.isManual && <Badge variant="info">Corrigida pela equipe</Badge>}
            </h3>
            {a ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                {[
                  ["Sentimento", SENTIMENT_LABEL[a.sentiment]],
                  ["Assunto", m.topic ?? "—"],
                  ["Emoção predominante", a.emotion ?? "—"],
                  ["Crítica ou elogio", STANCE_LABEL[a.stance]],
                  ["Ironia / sarcasmo", a.irony ? (a.sarcasm ? "Sarcasmo" : "Ironia") : "Não detectado"],
                  ["Confiança", `${Math.round(a.confidence * 100)}%`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
                {a.context && (
                  <div className="col-span-full">
                    <dt className="text-xs text-muted-foreground">Contexto</dt>
                    <dd className="mt-0.5 text-muted-foreground">{a.context}</dd>
                  </div>
                )}
                <div className="col-span-full text-[11px] text-muted-foreground/80">
                  {a.isManual ? "Classificação definida manualmente." : `Classificação automática${a.model && !isDemo ? ` (${a.model})` : ""}. Pode conter erros — corrija quando necessário.`}
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Esta menção ainda não foi classificada.</p>
            )}
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Relevância: {relevanceLabel(m.relevance)}</span>
              <span>Alcance: {m.reach !== null ? formatCompact(m.reach) : "não informado"}</span>
              <span>Engajamento: {m.engagement !== null ? formatCompact(m.engagement) : "não informado"}</span>
              <span>Status: {STATUS_LABEL[m.status]}</span>
            </div>
            {m.url && (
              <Button asChild className="mt-6">
                <a href={m.url} target="_blank" rel="noopener noreferrer nofollow">
                  Abrir publicação original <ExternalLink />
                </a>
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmptyFeed({ filtered, isDemo, onAdd, canWork }: { filtered: boolean; isDemo: boolean; onAdd: () => void; canWork: boolean }) {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-background">
        <MessagesSquare className="size-5 text-muted-foreground" />
      </span>
      <h2 className="mt-4 text-base font-semibold">{filtered ? "Nenhuma menção com esses filtros" : "Nenhuma menção ainda"}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {filtered
          ? "Tente ampliar o período ou remover algum filtro."
          : "Os conectores automáticos chegam na Fase 3. Enquanto isso, a equipe pode registrar manualmente publicações públicas relevantes — elas entram na análise e no dashboard."}
      </p>
      {!filtered && !isDemo && canWork && (
        <Button onClick={onAdd} className="mt-6">
          <Plus /> Registrar primeira menção
        </Button>
      )}
    </Card>
  );
}
