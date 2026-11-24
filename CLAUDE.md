# CLAUDE.md — Painel de Conteúdo @davisantsofc

> A pasta `pulso/` contém outro app independente (PULSO, inteligência de reputação digital) com
> `package.json`, `CLAUDE.md` e `README.md` próprios. Ela é excluída do `tsconfig`/ESLint da raiz.

Painel interno do negócio de criador do **@davisantsofc**: hooks, métricas, concorrentes,
agendamento, calendário editorial e notícias de IA num lugar só.

## Stack

| Camada      | Escolha                                   | Por quê |
|-------------|-------------------------------------------|---------|
| Framework   | **Next.js 15** (App Router, `src/`)       | Server Components por padrão; rotas de API no mesmo projeto (`/api/caption`). |
| Linguagem   | TypeScript (strict)                       | Contratos de dados em `src/lib/types.ts` são a fonte de verdade. |
| Estilo      | **Tailwind CSS v4** (CSS-first, sem `tailwind.config`) | Tokens definidos direto em `globals.css` via `@theme inline`. |
| Componentes | **shadcn/ui** (estilo new-york, base Radix) | Código copiado para `src/components/ui/` — é nosso, pode editar. |
| Ícones      | lucide-react                              | Padrão do shadcn. |
| Gráficos    | Recharts                                  | Usado só em Analytics (`views-chart.tsx`). |
| Fonte       | Geist / Geist Mono (`next/font`)          | |

Comandos:

```bash
npm run dev     # desenvolvimento em http://localhost:3000
npm run build   # build de produção + checagem de tipos + lint
npm run lint
```

## Estrutura

```
src/
  app/
    layout.tsx            # <html class="dark">, sidebar, container das páginas
    page.tsx              # redireciona para /hook-vault
    hook-vault/           # Hook Vault
    analytics/            # Analytics
    concorrentes/         # Concorrentes
    agendador/            # Agendador
    calendario/           # Calendário
    em-alta/              # Em Alta
    api/caption/route.ts  # POST { idea, platforms } -> { caption }
  components/
    ui/                   # primitivos shadcn/ui
    app-sidebar.tsx       # sidebar (desktop) + barra de abas (mobile), handle no topo
    page-header.tsx       # título/descrição/ações de cada página (lê de nav.ts)
    stat-card.tsx         # KPI com delta
    <página>/             # componentes específicos de cada página
  lib/
    nav.ts                # FONTE ÚNICA das 6 páginas: título, rota, ícone, descrição
    types.ts              # tipos de domínio (Hook, Reel, NewsItem, …)
    caption.ts            # gerador de legenda (placeholder do LLM)
    data/*.ts             # dados MOCK de cada página
    utils.ts              # cn(), formatCompact(), formatPct()
```

## As 6 páginas

| Rota            | Página        | O que faz | Dados |
|-----------------|---------------|-----------|-------|
| `/hook-vault`   | Hook Vault    | Hooks virais salvos com transcrição original + template com `{placeholders}` destacados. Busca, filtro por categoria, ordenação, copiar template. | `data/hooks.ts` |
| `/analytics`    | Analytics     | KPIs da semana (views, saves, follows, save rate) vs. semana anterior, gráfico de 30 dias e tabela de **heaters**. | `data/analytics.ts` |
| `/concorrentes` | Concorrentes  | Top reels dos criadores seguidos, ordenados pelo múltiplo sobre a mediana do criador. Botão "Vault" para salvar o hook. | `data/competitors.ts` |
| `/agendador`    | Agendador     | Compositor: ideia → "Gerar legenda" (chama `/api/caption`) → escolher redes → agendar em todas num clique. Fila ao lado. | `data/scheduler.ts` |
| `/calendario`   | Calendário    | Grade mensal (lista no mobile) com hook + ângulo + formato + status. Entradas com `fromScript: true` vieram do comando `/script` (ícone de terminal). | `data/calendar.ts` |
| `/em-alta`      | Em Alta       | Notícias de IA de 12 fontes com **hook score** 0–100 e hook sugerido. Filtro por fonte/score, "Mandar pro /script". | `data/trending.ts` |

## Decisões

1. **Dark mode fixo.** `layout.tsx` põe `class="dark"` no `<html>`. Os tokens claros em `:root`
   existem só como reserva; não há seletor de tema. Para adicionar um, usar `next-themes` com `attribute="class"`.
2. **Accent terracota.** `--primary` = `oklch(0.67 0.135 42)` no dark. Os neutros têm leve matiz quente
   (hue ~50) para combinar com o terracota em vez de cinza azulado. `--accent` é um terracota escuro
   usado em badges e nos `{placeholders}`. Cores de gráfico em `--chart-1..5` (chart-1 = terracota).
   **Não usar cores hex soltas nos componentes** — sempre tokens (`bg-primary`, `text-muted-foreground`, …).
3. **shadcn/ui escrito à mão.** O registro (`ui.shadcn.com`) estava bloqueado pela rede no momento do
   setup, então os componentes em `src/components/ui/` foram escritos seguindo o código oficial
   (new-york, Radix). `components.json` está configurado: com rede liberada, `npx shadcn@latest add <comp>`
   funciona normalmente. Componentes extras: `Badge` ganhou as variantes `accent` e `success`;
   `Progress` aceita `indicatorClassName`.
4. **`lib/nav.ts` é a fonte única** das páginas. Sidebar, `PageHeader` e `metadata.title` leem dali.
   Nova página = novo item em `navItems` + pasta em `app/`.
5. **Server Components por padrão; client só onde há estado.** Cada `page.tsx` é server e passa dados
   mock por props para um componente client (`hook-vault.tsx`, `scheduler.tsx`, …). Quando os dados
   vierem de API/DB, a busca fica no `page.tsx` (async) e os componentes client não mudam.
6. **Dados mock determinísticos.** Nada de `Math.random()`/`Date.now()` nos dados — evita erro de
   hidratação. A "data de hoje" do mock é **24/11/2026** (`TODAY` no calendário, semana 18–24/11 no Analytics).
7. **Heater = reel com ≥ 2× a mediana** de views do perfil (`HEATER_THRESHOLD` em `data/analytics.ts`).
   O mesmo conceito de múltiplo é usado em Concorrentes.
8. **Hook score:** ≥ 85 "Hook forte" (terracota), 60–84 "Bom potencial", < 60 "Fraco" (`scoreTone` em `news-feed.tsx`).
9. **Idioma e fuso.** UI em pt-BR; datas formatadas com `toLocaleString("pt-BR")` e `timeZone: "America/Belem"` (UTC−3, Amapá).
10. **Responsivo.** Sidebar fixa a partir de `md`; abaixo disso vira barra superior com abas roláveis.
    O calendário troca a grade por lista no mobile.

## Pontos de integração (o que é mock hoje)

| Página        | Integração real prevista |
|---------------|--------------------------|
| Hook Vault    | "Salvar hook por link": baixar o vídeo, transcrever (Whisper ou similar) e templatizar com LLM. Persistir em DB. |
| Analytics     | Instagram Graph API (insights de mídia e conta) via job diário. |
| Concorrentes  | Scraper semanal (cron, segunda 06:00) dos perfis em `trackedCreators`; calcular mediana por criador. |
| Agendador     | Trocar `generateCaption` em `lib/caption.ts` por chamada de LLM dentro de `/api/caption` (mesmo contrato). Publicação via APIs de cada rede ou serviço tipo Buffer/Ayrshare. |
| Calendário    | O comando `/script` grava `CalendarEntry` com `fromScript: true` (hook + ângulo + formato). |
| Em Alta       | Agregador de RSS/APIs das 12 fontes em `newsSources` + LLM atribuindo `hookScore` e `suggestedHook`. "Mandar pro /script" envia a notícia como briefing. |

Chaves de API ficam em `.env.local` (já no `.gitignore`), nunca no código.

## Convenções

- Imports com alias `@/`.
- Componentes de página em `src/components/<rota>/`; primitivos genéricos em `src/components/ui/`.
- Números: `formatCompact` (ex.: "2,4 mi") e `tabular-nums` em colunas numéricas.
- Antes de concluir uma mudança: `npm run build` precisa passar sem erros de tipo ou lint.
