# PULSO — Inteligência de reputação digital

Plataforma SaaS para monitorar a reputação digital de pessoas públicas (prefeitos, deputados, vereadores,
gestores) a partir de **conteúdo público**: menções, sentimento, tendências, crises e recomendações.

> Status: **Fases 1 e 2 concluídas** — estrutura, autenticação, banco com RLS, dashboard, demonstração,
> perfis monitorados com termos, central de menções e análise de sentimento por IA. Veja o [roadmap](#roadmap).

## Rodando localmente

```bash
cd pulso
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev                  # http://localhost:3000
```

Sem `.env.local` o app sobe normalmente: a **demonstração** (`/demo`) funciona por completo e as telas de
login/cadastro mostram um aviso de configuração, com os formulários desabilitados.

| Comando            | O que faz |
|--------------------|-----------|
| `npm run dev`      | Desenvolvimento |
| `npm run build`    | Build de produção + tipos + lint |
| `npm test`         | Testes de lógica (termos, índice, filtros, prompt) |
| `npm run test:db`  | Sobe um Postgres temporário, aplica as migrations e roda os testes de RLS (requer binários do PostgreSQL) |

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique as migrations de `supabase/migrations/` em ordem — pela CLI (`supabase link` + `supabase db push`)
   ou colando cada arquivo no SQL Editor.
3. Em **Settings → API**, copie `URL`, `anon key` e `service_role key` para o `.env.local`.
4. Em **Authentication → URL Configuration**:
   - *Site URL*: a URL do app (ex.: `http://localhost:3000`)
   - *Redirect URLs*: `http://localhost:3000/auth/callback` (e a URL de produção equivalente)
5. (Opcional) Agende a retenção de dados com pg_cron:
   ```sql
   select cron.schedule('pulso-retencao', '17 4 * * *', 'select public.purge_expired_data()');
   ```

A `SUPABASE_SERVICE_ROLE_KEY` é usada **somente no servidor** (exclusão de conta e, na Fase 3, conectores).
Nunca a exponha com prefixo `NEXT_PUBLIC_`.

## Arquitetura

- **Next.js 15 (App Router)** + TypeScript strict, **Tailwind v4**, componentes no estilo **shadcn/ui** (Radix),
  **Lucide**, **Recharts**, **Zod** + **React Hook Form**, **Sonner** (toasts), fonte **Inter** empacotada.
- **Supabase** (Postgres + Auth) via `@supabase/ssr`: sessão em cookies, renovada no `middleware.ts`, que também
  protege `/painel` e `/onboarding`.
- **Um só cálculo, duas fontes de dados.** `src/lib/metrics/` transforma uma lista de menções em todos os números
  do dashboard. No modo real as menções vêm do Postgres (sob RLS); em `/demo`, de um gerador fictício
  determinístico (`src/lib/demo/data.ts`) que **nunca toca o banco**.
- **Server Components por padrão**; os gráficos e filtros são client components que recebem dados já agregados.

```
pulso/
  supabase/
    migrations/      # esquema, RLS + RPCs, retenção (LGPD)
    tests/           # stub do Supabase + testes de isolamento (npm run test:db)
  src/
    middleware.ts
    app/
      page.tsx                 # entrada
      (auth)/                  # entrar, cadastro, recuperar-senha, redefinir-senha + server actions
      auth/callback, auth/sair # troca de código por sessão, logout
      onboarding/              # etapas 1–6; cria a organização
      painel/                  # app autenticado: dashboard, conta, organização
      demo/                    # mesmo dashboard com dados fictícios
      privacidade/
    components/
      ui/          # primitivos (button, card, dialog, dropdown…)
      shell/       # sidebar, seletor de organização, banner de demonstração
      dashboard/   # KPIs, Pulso de Reputação, gráficos, heatmap
    lib/
      nav.ts                 # fonte única das páginas e da fase de cada uma
      metrics/               # período, Pulso de Reputação, agregação do dashboard
      connectors/            # catálogo de fontes + contrato de conector (Fase 3)
      data/                  # consultas ao Supabase (sessão, perfis, fontes, menções)
      demo/                  # gerador da demonstração
      supabase/              # clientes server/admin/middleware
      validation/            # schemas Zod
```

## Banco de dados

Tabelas: `users`, `organizations`, `organization_members`, `monitored_profiles`, `search_terms`,
`social_sources`, `social_connections`, `mentions`, `sentiment_analysis`, `topics`, `crisis_alerts`,
`reports`, `saved_mentions`, `notifications`, `ai_recommendations`, `audit_logs` — além de `plans` e
`subscriptions` (estrutura de assinatura, sem cobrança ativa).

Segurança:

- **RLS em todas as tabelas.** Membros só leem dados da própria organização; chaves estrangeiras compostas
  `(id, organization_id)` impedem ligar registros de organizações diferentes.
- **Papéis**: `owner`, `admin`, `analyst`, `viewer`. Escrita restrita por papel **e por coluna**
  (ex.: analistas só mudam `status`/`topic_id` das menções, nunca o conteúdo).
- Criação de organização e correção de sentimento só via RPC (`create_organization`, `correct_sentiment`);
  correções manuais ficam no histórico de `sentiment_analysis` para melhorar o modelo.
- `audit_logs` só recebe inserções via `log_audit()`; leitura para owner/admin.
- Ingestão de menções e classificações automáticas usam a service role (backend).
- `credentials_secret_id` de conexões nunca é exposto ao cliente (tokens vão para o Supabase Vault).

## Fase 2 — perfis, menções e sentimento

- **Perfis monitorados** (`/painel/perfis`): cadastro com foto (bucket privado `profile-photos`), apelidos e quatro
  grupos de termos — principais, relacionados, de contexto e exclusões. “Sugerir termos” propõe termos a partir do
  cadastro e “Testar os termos” mostra se um texto seria atribuído ao perfil (`src/lib/terms.ts`). Pausar, editar e
  excluir; o limite de perfis do plano é aplicado no banco.
- **Central de menções** (`/painel/mencoes`): feed com busca, filtros (período, rede, sentimento, assunto, relevância,
  tipo, status, salvas), ordenação e paginação no banco; salvar, mudar status (em análise, respondida, resolvida,
  ignorada), corrigir o sentimento e abrir o original.
- **Registro manual**: até os conectores da Fase 3, a equipe pode registrar publicações públicas encontradas
  (`add_manual_mention`). Nada é coletado automaticamente nem simulado.
- **Análise de sentimento** (`src/lib/sentiment/`): Claude classifica em lotes de 20 com saída estruturada (Zod):
  sentimento (positiva, negativa, neutra, mista, indeterminada), assunto, emoção, crítica/elogio, ironia, sarcasmo,
  contexto e confiança. O prompt pede para não confundir crítica com ataque, não julgar por partido, entender
  linguagem regional e usar “indeterminada” na dúvida; confiança < 0,45 vira indeterminada. As **correções manuais**
  ficam no histórico (`sentiment_analysis.is_manual`), prevalecem sobre a IA e entram como exemplos nas próximas
  análises. Requer `ANTHROPIC_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`; sem elas, as menções ficam “não classificadas”.

## Pulso de Reputação

Índice 0–100 (`src/lib/metrics/reputation.ts`, também explicado no app em “Metodologia”):

1. peso de cada menção = confiança × relevância da fonte × peso temporal (meia-vida = metade do período);
2. positiva = +1, negativa = −1, neutra/mista = 0; indeterminadas ficam de fora;
3. saldo ponderado S ∈ [−1, 1]; fator de volume k = n / (n + 25);
4. **Pulso = 50 + 50 · S · k**.

Tendência vs. período anterior de mesma duração: ±3 pontos → alta/queda; menos de 15 menções classificadas →
“dados insuficientes”. O índice representa a percepção nas fontes monitoradas — **não é pesquisa eleitoral**.

## Princípios

- Nenhum número fictício fora de `/demo`. Sem menções reais, o dashboard mostra um estado vazio explicando o porquê.
- Itens de fases futuras aparecem na navegação **desabilitados e marcados com a fase** — nada aparenta funcionar sem funcionar.
- Apenas fontes públicas e APIs autorizadas; nada de scraping de áreas privadas, mensagens privadas ou
  identificação de anônimos.

## Roadmap

| Fase | Entrega | Situação |
|------|---------|----------|
| 1 | Estrutura, identidade visual, autenticação, banco + RLS, dashboard e demonstração | ✅ |
| 2 | Perfis monitorados e termos, central de menções, filtros, análise de sentimento | ✅ |
| 3 | Conectores reais (APIs oficiais) e central de fontes | — |
| 4 | Inteligência, assistente, recomendações e radar de crises | — |
| 5 | Relatórios (PDF), notificações, convites e planos de assinatura | — |
| 6 | Testes de segurança, responsividade e ponta a ponta | — |
