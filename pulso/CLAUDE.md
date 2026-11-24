# CLAUDE.md — PULSO

App independente dentro de `pulso/` (o diretório raiz do repositório é outro projeto). Leia o `README.md`
desta pasta para arquitetura, banco e roadmap.

## Regras do projeto

- UI 100% em pt-BR. Datas no fuso `America/Belem` (UTC−3).
- Cores só por tokens (`bg-card`, `text-positive`, `bg-sent-negative`…), definidos em `src/app/globals.css`.
  Tema escuro fixo. Ícones: lucide-react, nunca emojis.
- `src/lib/nav.ts` é a fonte única das páginas e da fase em que cada uma fica pronta (`CURRENT_PHASE`).
  Ao concluir uma página, ajuste a `phase` e crie as rotas em `app/painel/` **e** `app/demo/`.
- Cálculos de métricas ficam em `src/lib/metrics/` e recebem `Mention[]` — servem ao modo real e à demo.
- **Nunca** exibir números inventados fora de `/demo`; dados de demo nunca vão para o banco.
- Toda tabela nova: `organization_id`, RLS habilitado, políticas por papel e teste em `supabase/tests/rls_test.sql`.
- Service role só em `src/lib/supabase/admin.ts` (server-only).
- Antes de concluir: `npm run build` e `npm run test:db` passando.
