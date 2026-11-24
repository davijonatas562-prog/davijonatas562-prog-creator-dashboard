-- =============================================================================
-- PULSO — Fase 3: conectores de fontes
-- =============================================================================

-- Segredos das conexões (tokens OAuth). Sem nenhuma política: só o backend
-- (service role) lê e grava. Nunca chegam ao navegador.
create table if not exists public.connection_secrets (
  connection_id    uuid primary key references public.social_connections (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  secrets          jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);
alter table public.connection_secrets enable row level security;
revoke all on public.connection_secrets from anon, authenticated;

-- Histórico de sincronizações (para a tela de Fontes e para auditoria)
create table if not exists public.sync_runs (
  id               bigint generated always as identity primary key,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  source_id        text not null references public.social_sources (id),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  found            integer not null default 0,
  inserted         integer not null default 0,
  error            text,
  trigger          text not null default 'manual' check (trigger in ('manual', 'cron'))
);
create index if not exists sync_runs_org_idx on public.sync_runs (organization_id, started_at desc);
alter table public.sync_runs enable row level security;
drop policy if exists sync_runs_select on public.sync_runs;
create policy sync_runs_select on public.sync_runs for select to authenticated
  using (public.is_org_member(organization_id));
revoke insert, update, delete on public.sync_runs from authenticated;

-- Catálogo: nomes e formas de acesso atualizados
update public.social_sources set name = 'Busca de notícias', access_method = 'API de notícias licenciada (GNews)', docs_url = 'https://gnews.io/docs/', is_available = true where id = 'google_news';
update public.social_sources set is_available = true where id in ('news_sites', 'blogs', 'youtube', 'instagram', 'facebook');
update public.social_sources set access_method = 'Instagram Graph API (conta profissional do próprio político)' where id = 'instagram';
update public.social_sources set access_method = 'Graph API (Página do próprio político)' where id = 'facebook';
