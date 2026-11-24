-- =============================================================================
-- PULSO — Esquema principal
-- Inteligência de reputação digital. Multi-tenant por organização.
-- Todas as tabelas de dados de cliente carregam organization_id e são
-- protegidas por RLS (ver 20261124000200_rls.sql).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'analyst', 'viewer');
create type public.profile_status as enum ('active', 'paused');
create type public.search_term_kind as enum ('primary', 'related', 'context', 'exclude');
create type public.source_category as enum ('social', 'video', 'news', 'blog', 'forum', 'other');
create type public.connection_status as enum ('not_connected', 'pending', 'connected', 'error', 'paused');
create type public.sentiment_label as enum ('positive', 'negative', 'neutral', 'mixed', 'undetermined');
create type public.mention_status as enum ('new', 'in_review', 'responded', 'resolved', 'ignored');
create type public.content_type as enum ('post', 'comment', 'video', 'article', 'reply', 'other');
create type public.stance as enum ('praise', 'criticism', 'neutral', 'question', 'unknown');
create type public.risk_level as enum ('low', 'moderate', 'high', 'critical');
create type public.alert_status as enum ('open', 'acknowledged', 'closed');
create type public.report_type as enum ('daily', 'weekly', 'monthly', 'crisis', 'reputation');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Planos de assinatura (catálogo global)
-- Limites null = ilimitado. Cobrança real só após configurar o gateway.
-- -----------------------------------------------------------------------------
create table public.plans (
  id                     text primary key,
  name                   text not null,
  description            text,
  price_cents_monthly    integer not null default 0,
  max_profiles           integer,
  max_sources            integer,
  max_users              integer,
  history_days           integer,
  max_reports_month      integer,
  max_alerts_month       integer,
  max_ai_queries_month   integer,
  stripe_price_id        text,
  sort_order             integer not null default 0,
  is_public              boolean not null default true,
  created_at             timestamptz not null default now()
);

insert into public.plans
  (id, name, description, price_cents_monthly, max_profiles, max_sources, max_users, history_days,
   max_reports_month, max_alerts_month, max_ai_queries_month, sort_order)
values
  ('essencial',    'Essencial',    'Para um mandato acompanhar a própria reputação.', 0,  1,  4,  3,   90,  10,  50,   200, 1),
  ('profissional', 'Profissional', 'Para equipes de comunicação com várias frentes.',  0,  5,  11, 10,  365, 60,  300,  1500, 2),
  ('agencia',      'Agência',      'Para agências que atendem vários clientes.',       0,  30, null, 40, 730, null, null, 8000, 3);

-- -----------------------------------------------------------------------------
-- Usuários (espelho público de auth.users)
-- -----------------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- Cria a linha em public.users quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Organizações e membros
-- -----------------------------------------------------------------------------
create table public.organizations (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(name) between 2 and 120),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  plan_id              text not null default 'essencial' references public.plans (id),
  data_retention_days  integer not null default 365 check (data_retention_days between 30 and 1825),
  created_by           uuid references public.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references public.users (id) on delete cascade,
  role             public.member_role not null default 'viewer',
  created_at       timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

-- Assinatura (preparada para Stripe; nenhum dado de cartão é guardado aqui)
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null unique references public.organizations (id) on delete cascade,
  plan_id                 text not null references public.plans (id),
  status                  public.subscription_status not null default 'trialing',
  provider                text not null default 'none',
  provider_customer_id    text,
  provider_subscription_id text,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Perfis monitorados e termos de busca
-- -----------------------------------------------------------------------------
create table public.monitored_profiles (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  full_name        text not null check (char_length(full_name) between 2 and 160),
  public_name      text not null check (char_length(public_name) between 2 and 160),
  nicknames        text[] not null default '{}',
  office           text,
  municipality     text,
  state            char(2) check (state ~ '^[A-Z]{2}$'),
  party            text,
  photo_url        text,
  status           public.profile_status not null default 'active',
  created_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, organization_id)
);
create index monitored_profiles_org_idx on public.monitored_profiles (organization_id);
create trigger monitored_profiles_updated_at before update on public.monitored_profiles
  for each row execute function public.set_updated_at();

create table public.search_terms (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  profile_id       uuid not null references public.monitored_profiles (id) on delete cascade,
  term             text not null check (char_length(term) between 2 and 120),
  kind             public.search_term_kind not null default 'primary',
  created_at       timestamptz not null default now(),
  unique (profile_id, kind, term),
  foreign key (profile_id, organization_id) references public.monitored_profiles (id, organization_id) on delete cascade
);
create index search_terms_profile_idx on public.search_terms (profile_id);

-- -----------------------------------------------------------------------------
-- Fontes (catálogo global) e conexões por organização
-- -----------------------------------------------------------------------------
create table public.social_sources (
  id              text primary key,
  name            text not null,
  category        public.source_category not null,
  access_method   text not null,          -- ex.: "API oficial (Graph API)"
  docs_url        text,
  requires_oauth  boolean not null default false,
  is_available    boolean not null default false, -- conector implementado no backend?
  sort_order      integer not null default 0
);

insert into public.social_sources (id, name, category, access_method, docs_url, requires_oauth, sort_order) values
  ('instagram',   'Instagram',          'social', 'API oficial (Instagram Graph API, contas profissionais)', 'https://developers.facebook.com/docs/instagram-platform', true, 1),
  ('facebook',    'Facebook',           'social', 'API oficial (Graph API, páginas públicas autorizadas)',  'https://developers.facebook.com/docs/graph-api', true, 2),
  ('x',           'X / Twitter',        'social', 'API oficial do X (plano pago)',                           'https://developer.x.com/en/docs/x-api', true, 3),
  ('tiktok',      'TikTok',             'video',  'API oficial (Research/Display API, mediante aprovação)',  'https://developers.tiktok.com/', true, 4),
  ('youtube',     'YouTube',            'video',  'YouTube Data API v3',                                    'https://developers.google.com/youtube/v3', false, 5),
  ('threads',     'Threads',            'social', 'API oficial do Threads',                                  'https://developers.facebook.com/docs/threads', true, 6),
  ('google_news', 'Google News',        'news',   'Feeds RSS públicos de busca',                             'https://news.google.com/', false, 7),
  ('news_sites',  'Sites de notícias',  'news',   'RSS/Atom públicos cadastrados pela equipe',               null, false, 8),
  ('blogs',       'Blogs',              'blog',   'RSS/Atom públicos cadastrados pela equipe',               null, false, 9),
  ('reddit',      'Reddit',             'forum',  'API oficial do Reddit',                                   'https://www.reddit.com/dev/api/', true, 10),
  ('other',       'Outras fontes públicas', 'other', 'Conector genérico de feeds públicos',                 null, false, 11);

create table public.social_connections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  source_id        text not null references public.social_sources (id),
  status           public.connection_status not null default 'not_connected',
  last_synced_at   timestamptz,
  mentions_found   integer not null default 0,
  last_error       text,
  -- configuração NÃO secreta (ex.: lista de feeds RSS). Tokens ficam no Supabase Vault,
  -- referenciados por credentials_secret_id e lidos só pelo backend (service role).
  config           jsonb not null default '{}'::jsonb,
  credentials_secret_id uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, source_id)
);
create trigger social_connections_updated_at before update on public.social_connections
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Assuntos
-- -----------------------------------------------------------------------------
create table public.topics (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  slug             text not null,
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);

-- -----------------------------------------------------------------------------
-- Menções (somente conteúdo público coletado por conectores autorizados)
-- -----------------------------------------------------------------------------
create table public.mentions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  profile_id       uuid not null references public.monitored_profiles (id) on delete cascade,
  source_id        text not null references public.social_sources (id),
  external_id      text not null,
  url              text,
  author_name      text,
  author_handle    text,
  content          text,
  summary          text,
  content_type     public.content_type not null default 'post',
  published_at     timestamptz not null,
  collected_at     timestamptz not null default now(),
  reach            integer check (reach >= 0),
  engagement       integer check (engagement >= 0),
  relevance        numeric(3,2) not null default 0.5 check (relevance between 0 and 1),
  status           public.mention_status not null default 'new',
  topic_id         uuid references public.topics (id) on delete set null,
  updated_at       timestamptz not null default now(),
  unique (profile_id, source_id, external_id),
  unique (id, organization_id),
  foreign key (profile_id, organization_id) references public.monitored_profiles (id, organization_id) on delete cascade
);
create index mentions_profile_published_idx on public.mentions (profile_id, published_at desc);
create index mentions_org_idx on public.mentions (organization_id);
create trigger mentions_updated_at before update on public.mentions
  for each row execute function public.set_updated_at();

-- Classificações (histórico). A mais recente por menção vale; correções manuais
-- ficam marcadas com is_manual e são usadas como exemplos para melhorar o modelo.
create table public.sentiment_analysis (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  mention_id          uuid not null references public.mentions (id) on delete cascade,
  sentiment           public.sentiment_label not null,
  topic_id            uuid references public.topics (id) on delete set null,
  emotion             text,
  stance              public.stance not null default 'unknown',
  irony               boolean not null default false,
  sarcasm             boolean not null default false,
  context             text,
  confidence          numeric(3,2) not null check (confidence between 0 and 1),
  model               text not null,           -- ex.: "manual" ou id do modelo
  is_manual           boolean not null default false,
  corrected_by        uuid references public.users (id) on delete set null,
  previous_sentiment  public.sentiment_label,
  created_at          timestamptz not null default now(),
  foreign key (mention_id, organization_id) references public.mentions (id, organization_id) on delete cascade
);
create index sentiment_analysis_mention_idx on public.sentiment_analysis (mention_id, created_at desc);

-- Visão com a classificação vigente de cada menção (respeita RLS de quem consulta)
create view public.mentions_with_sentiment
with (security_invoker = true) as
select
  m.*,
  sa.sentiment,
  sa.confidence,
  sa.emotion,
  sa.stance,
  sa.is_manual as sentiment_is_manual,
  t.name as topic_name
from public.mentions m
left join lateral (
  select s.sentiment, s.confidence, s.emotion, s.stance, s.is_manual
  from public.sentiment_analysis s
  where s.mention_id = m.id
  order by s.is_manual desc, s.created_at desc
  limit 1
) sa on true
left join public.topics t on t.id = m.topic_id;

create table public.saved_mentions (
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  mention_id       uuid not null references public.mentions (id) on delete cascade,
  user_id          uuid not null references public.users (id) on delete cascade,
  note             text,
  created_at       timestamptz not null default now(),
  primary key (mention_id, user_id),
  foreign key (mention_id, organization_id) references public.mentions (id, organization_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Alertas, relatórios, recomendações, notificações
-- -----------------------------------------------------------------------------
create table public.crisis_alerts (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  profile_id           uuid not null references public.monitored_profiles (id) on delete cascade,
  title                text not null,
  description          text not null,
  topic_id             uuid references public.topics (id) on delete set null,
  risk_level           public.risk_level not null,
  started_at           timestamptz not null,
  mention_count        integer not null default 0,
  networks             text[] not null default '{}',
  rationale            text not null,
  confidence           numeric(3,2) not null check (confidence between 0 and 1),
  suggested_actions    jsonb not null default '[]'::jsonb,
  evidence_mention_ids uuid[] not null default '{}',
  status               public.alert_status not null default 'open',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  foreign key (profile_id, organization_id) references public.monitored_profiles (id, organization_id) on delete cascade
);
create index crisis_alerts_profile_idx on public.crisis_alerts (profile_id, created_at desc);
create trigger crisis_alerts_updated_at before update on public.crisis_alerts
  for each row execute function public.set_updated_at();

create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  profile_id       uuid not null references public.monitored_profiles (id) on delete cascade,
  type             public.report_type not null,
  title            text not null,
  period_start     timestamptz not null,
  period_end       timestamptz not null check (period_end > period_start),
  content          jsonb not null default '{}'::jsonb,
  shared_with_org  boolean not null default false,
  created_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  foreign key (profile_id, organization_id) references public.monitored_profiles (id, organization_id) on delete cascade
);
create index reports_profile_idx on public.reports (profile_id, created_at desc);

create table public.ai_recommendations (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  profile_id           uuid not null references public.monitored_profiles (id) on delete cascade,
  period_start         timestamptz not null,
  period_end           timestamptz not null,
  question_key         text not null,   -- ex.: "principais_criticas"
  content              text not null,
  evidence_mention_ids uuid[] not null default '{}',
  insufficient_data    boolean not null default false,
  model                text not null,
  created_at           timestamptz not null default now(),
  foreign key (profile_id, organization_id) references public.monitored_profiles (id, organization_id) on delete cascade
);
create index ai_recommendations_profile_idx on public.ai_recommendations (profile_id, created_at desc);

create table public.notifications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references public.users (id) on delete cascade,
  type             text not null,
  title            text not null,
  body             text,
  link             text,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Auditoria (somente inserção via função; leitura para admins)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id               bigint generated always as identity primary key,
  organization_id  uuid references public.organizations (id) on delete cascade,
  user_id          uuid references public.users (id) on delete set null,
  action           text not null,
  entity           text,
  entity_id        text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);
