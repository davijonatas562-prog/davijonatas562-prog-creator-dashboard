"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CircleAlert, CircleDashed, CirclePause, ExternalLink, Loader2, Lock, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { SOURCES, sourceName } from "@/lib/connectors/catalog";
import type { ActionResult } from "@/lib/action-result";
import type { ConnectionStatus, MonitoredProfile, SourceId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { dateTime, relativeTime } from "@/components/dashboard/format";

export interface SourceRow {
  sourceId: SourceId;
  status: ConnectionStatus;
  lastSyncedAt: string | null;
  mentionsFound: number;
  lastError: string | null;
  feeds: string[];
  implemented: boolean;
  missingSetup: string | null;
  unavailableReason: string | null;
}

export interface MetaPageOption {
  pageId: string;
  pageName: string;
  igUserId: string | null;
  igUsername: string | null;
}

export interface SyncRunRow {
  id: number;
  sourceId: SourceId;
  startedAt: string;
  found: number;
  inserted: number;
  error: string | null;
  trigger: "manual" | "cron";
}

export interface SourcesActions {
  setEnabled: (sourceId: string, enabled: boolean) => Promise<ActionResult>;
  saveFeeds: (sourceId: string, feeds: string[]) => Promise<ActionResult>;
  saveMetaAccounts: (mapping: { profileId: string; pageId: string }[]) => Promise<ActionResult>;
  disconnectMeta: () => Promise<ActionResult>;
  syncNow: (sourceId?: string) => Promise<ActionResult>;
}

const META_MESSAGES: Record<string, [string, "success" | "error"]> = {
  ok: ["Conta da Meta autorizada. Agora escolha qual Página pertence a cada político.", "success"],
  cancelado: ["A autorização foi cancelada no Facebook.", "error"],
  estado: ["A autorização expirou ou veio de outra aba. Tente conectar de novo.", "error"],
  permissao: ["Apenas proprietários e administradores podem conectar contas.", "error"],
  config: ["O app da Meta ainda não está configurado no servidor.", "error"],
  servicekey: ["Conectar contas exige a SUPABASE_SERVICE_ROLE_KEY no servidor.", "error"],
  sempaginas: ["Nenhuma Página do Facebook foi autorizada. Na tela da Meta, selecione a Página do político.", "error"],
  erro: ["Não foi possível concluir a conexão com a Meta. Tente novamente.", "error"],
};

const DEMO_NOTE = "Na demonstração, as alterações não são salvas.";

export function SourcesBoard({
  mode,
  rows,
  runs,
  profiles,
  metaConfigured,
  metaPages,
  metaAccounts,
  canEdit,
  maxSources,
  actions,
}: {
  mode: "app" | "demo";
  rows: SourceRow[];
  runs: SyncRunRow[];
  profiles: MonitoredProfile[];
  metaConfigured: boolean;
  metaPages: MetaPageOption[];
  metaAccounts: { profileId: string; pageId: string }[];
  canEdit: boolean;
  maxSources: number | null;
  actions?: SourcesActions;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [syncing, startSync] = React.useTransition();
  const isDemo = mode === "demo";
  const active = rows.filter((r) => r.status === "connected").length;

  React.useEffect(() => {
    const m = params.get("meta");
    if (m && META_MESSAGES[m]) {
      const [msg, kind] = META_MESSAGES[m];
      if (kind === "success") toast.success(msg);
      else toast.error(msg);
      router.replace("/painel/fontes", { scroll: false });
    }
  }, [params, router]);

  const call = async (fn: () => Promise<ActionResult>) => {
    if (isDemo || !actions) {
      toast.info(DEMO_NOTE);
      return false;
    }
    const r = await fn();
    if (r.ok) {
      toast.success(r.message ?? "Pronto.");
      router.refresh();
      return true;
    }
    toast.error(r.error, { duration: 9000 });
    return false;
  };

  const syncAll = () => startSync(async () => void (await call(() => actions!.syncNow())));
  const byId = (id: SourceId) => rows.find((r) => r.sourceId === id)!;
  const meta = { facebook: byId("facebook"), instagram: byId("instagram") };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fontes de monitoramento</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            De onde vêm as menções. Usamos apenas APIs oficiais, provedores licenciados e conteúdo público. Nada é coletado de áreas
            privadas, e fontes sem acesso oficial aparecem como indisponíveis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs tabular-nums text-muted-foreground">
            {active} ativa{active === 1 ? "" : "s"}
            {maxSources !== null ? ` de ${maxSources} no plano` : ""}
          </span>
          <Button onClick={syncAll} disabled={syncing || !active || (!canEdit && !isDemo)}>
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {syncing ? "Coletando…" : "Coletar agora"}
          </Button>
        </div>
      </div>

      <MetaPanel
        isDemo={isDemo}
        rows={meta}
        configured={metaConfigured}
        pages={metaPages}
        accounts={metaAccounts}
        profiles={profiles}
        canEdit={canEdit}
        call={call}
        actions={actions}
      />

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        {SOURCES.filter((s) => s.id !== "facebook" && s.id !== "instagram").map((s) => (
          <SourceCard key={s.id} row={byId(s.id)} canEdit={canEdit} call={call} actions={actions} />
        ))}
      </ul>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Últimas coletas</h2>
        {runs.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhuma coleta ainda. Ative uma fonte e toque em “Coletar agora”. A coleta automática roda uma vez por dia.</p>
        ) : (
          <div className="mt-3 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 text-left font-medium">Quando</th>
                  <th className="py-2 text-left font-medium">Fonte</th>
                  <th className="py-2 text-left font-medium">Origem</th>
                  <th className="py-2 text-right font-medium">Encontradas</th>
                  <th className="py-2 text-right font-medium">Novas</th>
                  <th className="py-2 pl-4 text-left font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2" title={dateTime(r.startedAt)}>{relativeTime(r.startedAt)}</td>
                    <td className="py-2">{sourceName(r.sourceId)}</td>
                    <td className="py-2 text-muted-foreground">{r.trigger === "cron" ? "Automática" : "Manual"}</td>
                    <td className="py-2 text-right tabular-nums">{r.found}</td>
                    <td className="py-2 text-right tabular-nums">{r.inserted}</td>
                    <td className={cn("py-2 pl-4", r.error ? "text-negative" : "text-positive")}>{r.error ?? "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatusPill({ row }: { row: SourceRow }) {
  if (!row.implemented) return <Badge variant="muted"><Lock /> Indisponível</Badge>;
  if (row.status === "connected" && row.lastError) return <Badge variant="negative"><CircleAlert /> Com erro</Badge>;
  if (row.status === "connected") return <Badge variant="positive"><CheckCircle2 /> Ativa</Badge>;
  if (row.status === "paused") return <Badge variant="muted"><CirclePause /> Pausada</Badge>;
  if (row.status === "error") return <Badge variant="negative"><CircleAlert /> Erro</Badge>;
  return <Badge variant="outline"><CircleDashed /> Não conectada</Badge>;
}

function Stats({ row }: { row: SourceRow }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-xs">
      <div>
        <dt className="text-muted-foreground">Última sincronização</dt>
        <dd className="mt-0.5 font-medium" title={row.lastSyncedAt ? dateTime(row.lastSyncedAt) : undefined}>
          {row.lastSyncedAt ? relativeTime(row.lastSyncedAt) : "Nunca"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Menções encontradas</dt>
        <dd className="mt-0.5 font-medium tabular-nums">{row.mentionsFound.toLocaleString("pt-BR")}</dd>
      </div>
      {row.lastError && (
        <div className="col-span-2 rounded-md border border-negative/30 bg-negative/10 px-2.5 py-2 text-negative">{row.lastError}</div>
      )}
    </dl>
  );
}

const SETUP_HELP: Partial<Record<SourceId, string>> = {
  google_news: "Crie uma conta em gnews.io, copie a API key e adicione na Vercel como GNEWS_API_KEY. O plano gratuito é só para testes; para uso comercial, contrate um plano pago.",
  youtube: "No Google Cloud Console, ative a “YouTube Data API v3”, crie uma chave de API e adicione na Vercel como YOUTUBE_API_KEY. A cota diária gratuita atende o monitoramento de alguns perfis.",
};

function SourceCard({
  row,
  canEdit,
  call,
  actions,
}: {
  row: SourceRow;
  canEdit: boolean;
  call: (fn: () => Promise<ActionResult>) => Promise<boolean>;
  actions?: SourcesActions;
}) {
  const def = SOURCES.find((s) => s.id === row.sourceId)!;
  const [pending, start] = React.useTransition();
  const [feedsText, setFeedsText] = React.useState(row.feeds.join("\n"));
  const isRss = row.sourceId === "news_sites" || row.sourceId === "blogs";
  const enabled = row.status === "connected";
  React.useEffect(() => setFeedsText(row.feeds.join("\n")), [row.feeds]);

  return (
    <li className="min-w-0">
      <Card className={cn("flex h-full flex-col gap-4 p-5", !row.implemented && "opacity-70")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{row.sourceId === "google_news" ? "Busca de notícias" : def.name}</p>
            <p className="text-xs text-muted-foreground">{row.sourceId === "google_news" ? "API de notícias licenciada (GNews)" : def.accessMethod}</p>
          </div>
          <StatusPill row={row} />
        </div>

        {!row.implemented ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{row.unavailableReason}</p>
        ) : (
          <>
            <Stats row={row} />
            {row.missingSetup && (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning">
                <p className="font-medium">{row.missingSetup}</p>
                {SETUP_HELP[row.sourceId] && <p className="mt-1 text-warning/90">{SETUP_HELP[row.sourceId]}</p>}
              </div>
            )}
            {isRss && (
              <div className="grid gap-2">
                <label htmlFor={`feeds-${row.sourceId}`} className="text-xs font-medium">
                  Feeds RSS (um por linha)
                </label>
                <textarea
                  id={`feeds-${row.sourceId}`}
                  rows={3}
                  value={feedsText}
                  disabled={!canEdit}
                  onChange={(e) => setFeedsText(e.target.value)}
                  placeholder={row.sourceId === "blogs" ? "https://blogdoexemplo.com.br/feed" : "https://portaldoexemplo.com.br/feed/"}
                  className="w-full rounded-md border border-input bg-background/60 px-3 py-2 font-mono text-xs outline-none focus-visible:border-primary/70"
                />
                <p className="text-[11px] text-muted-foreground">
                  Muitos portais e blogs têm feed em <code>/feed</code> ou <code>/rss</code>. Só entram as notícias que citam os termos do político.
                </p>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await call(() => actions!.saveFeeds(row.sourceId, feedsText.split(/\s+/).filter(Boolean)));
                      })
                    }
                  >
                    {pending && <Loader2 className="animate-spin" />} Verificar e salvar feeds
                  </Button>
                )}
              </div>
            )}
            {canEdit && (
              <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  size="sm"
                  variant={enabled ? "outline" : "default"}
                  disabled={pending}
                  onClick={() => start(async () => void (await call(() => actions!.setEnabled(row.sourceId, !enabled))))}
                >
                  {enabled ? "Pausar" : "Ativar"}
                </Button>
                {enabled && (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => void (await call(() => actions!.syncNow(row.sourceId))))}>
                    {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Coletar esta fonte
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </li>
  );
}

function MetaPanel({
  isDemo,
  rows,
  configured,
  pages,
  accounts,
  profiles,
  canEdit,
  call,
  actions,
}: {
  isDemo: boolean;
  rows: { facebook: SourceRow; instagram: SourceRow };
  configured: boolean;
  pages: MetaPageOption[];
  accounts: { profileId: string; pageId: string }[];
  profiles: MonitoredProfile[];
  canEdit: boolean;
  call: (fn: () => Promise<ActionResult>) => Promise<boolean>;
  actions?: SourcesActions;
}) {
  const [map, setMap] = React.useState<Record<string, string>>(() => Object.fromEntries(accounts.map((a) => [a.profileId, a.pageId])));
  const [pending, start] = React.useTransition();
  const authorized = pages.length > 0;

  return (
    <Card className="grid gap-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">Instagram e Facebook</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Pela API oficial da Meta, o PULSO lê os <strong className="text-foreground">comentários nos posts do próprio político</strong> e as
            publicações em que ele foi <strong className="text-foreground">marcado</strong> no Instagram. Exige que o dono da conta (ou um
            administrador da Página) autorize. A Meta não permite buscar por nome em todo o Instagram/Facebook nem ler comentários de perfis de
            terceiros.
          </p>
        </div>
        <div className="flex gap-2">
          <StatusPill row={rows.facebook} />
          <StatusPill row={rows.instagram} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <p className="text-xs font-medium">Facebook</p>
          <Stats row={rows.facebook} />
        </div>
        <div className="grid gap-1">
          <p className="text-xs font-medium">Instagram</p>
          <Stats row={rows.instagram} />
        </div>
      </div>

      {!configured && !isDemo ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-warning">
          <p className="font-medium">O app da Meta ainda não está configurado neste servidor.</p>
          <p className="mt-1 text-warning/90">
            É preciso criar um app em developers.facebook.com (produto “Facebook Login para Empresas”), cadastrar o endereço de retorno
            <code className="mx-1">/api/conectores/meta/retorno</code> e adicionar META_APP_ID e META_APP_SECRET na Vercel. Em modo de
            desenvolvimento, o app já funciona com as contas em que você é administrador. Para clientes, a Meta faz uma análise do app.
          </p>
        </div>
      ) : (
        canEdit && (
          <div className="flex flex-wrap gap-2">
            {isDemo ? (
              <Button onClick={() => toast.info(DEMO_NOTE)}>Conectar com Facebook</Button>
            ) : (
              <Button asChild>
                <a href="/api/conectores/meta/iniciar">{authorized ? "Reautorizar com Facebook" : "Conectar com Facebook"}</a>
              </Button>
            )}
            {authorized && (
              <Button variant="ghost" disabled={pending} onClick={() => start(async () => void (await call(() => actions!.disconnectMeta())))}>
                <Unplug /> Desconectar
              </Button>
            )}
            <Button asChild variant="ghost">
              <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer">
                Gerenciar acessos na Meta <ExternalLink />
              </a>
            </Button>
          </div>
        )
      )}

      {authorized && profiles.length > 0 && (
        <div className="grid gap-3 rounded-lg border border-border p-4">
          <p className="text-xs font-medium">Qual Página pertence a cada político?</p>
          {profiles.map((p) => (
            <div key={p.id} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
              <span className="truncate text-sm">{p.publicName}</span>
              <NativeSelect value={map[p.id] ?? ""} disabled={!canEdit} onChange={(e) => setMap((m) => ({ ...m, [p.id]: e.target.value }))} aria-label={`Página de ${p.publicName}`}>
                <option value="">Nenhuma</option>
                {pages.map((pg) => (
                  <option key={pg.pageId} value={pg.pageId}>
                    {pg.pageName}
                    {pg.igUsername ? ` + Instagram @${pg.igUsername}` : " (sem Instagram profissional)"}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ))}
          {canEdit && (
            <Button
              size="sm"
              className="w-fit"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await call(() =>
                    actions!.saveMetaAccounts(
                      Object.entries(map)
                        .filter(([, v]) => v)
                        .map(([profileId, pageId]) => ({ profileId, pageId })),
                    ),
                  );
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Salvar vínculos
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
