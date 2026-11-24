-- PULSO — instalação completa do banco (gerado a partir de migrations/, na ordem). Rode uma única vez.

-- ===== migrations/20261124000100_schema.sql =====
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

-- ===== migrations/20261124000200_rls.sql =====
-- =============================================================================
-- PULSO — Segurança: funções auxiliares, RPCs e Row Level Security
--
-- Regra geral: um usuário só enxerga linhas de organizações das quais é membro.
-- Papéis:
--   owner   — tudo, inclusive excluir a organização
--   admin   — gerencia membros, perfis, fontes e configurações
--   analyst — trabalha menções (status, correção de sentimento), alertas e relatórios
--   viewer  — somente leitura
-- Ingestão de menções e classificações automáticas usam a service role (backend),
-- que ignora RLS. A chave service role NUNCA vai para o navegador.
-- =============================================================================

-- anon não acessa nada do esquema public diretamente
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- -----------------------------------------------------------------------------
-- Funções auxiliares (security definer para não recursar nas políticas)
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = auth.uid() and role = any (roles)
  );
$$;

create or replace function public.can_edit_org(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_org_role(org, array['owner','admin']::public.member_role[]); $$;

create or replace function public.can_work_org(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_org_role(org, array['owner','admin','analyst']::public.member_role[]); $$;

-- Registro de auditoria (única porta de entrada para audit_logs)
create or replace function public.log_audit(
  org uuid, p_action text, p_entity text default null, p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if org is not null and not public.is_org_member(org) and auth.role() <> 'service_role' then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  insert into public.audit_logs (organization_id, user_id, action, entity, entity_id, metadata)
  values (org, auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: criar organização (o criador vira owner). Inserção direta é bloqueada.
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_base text;
  v_slug text;
  v_n    integer := 0;
  v_org  public.organizations;
begin
  if v_uid is null then
    raise exception 'autenticação necessária' using errcode = '42501';
  end if;
  p_name := btrim(p_name);
  if char_length(p_name) < 2 or char_length(p_name) > 120 then
    raise exception 'nome da organização deve ter entre 2 e 120 caracteres' using errcode = '22023';
  end if;
  -- limite simples contra abuso: até 5 organizações criadas por usuário
  if (select count(*) from public.organizations where created_by = v_uid) >= 5 then
    raise exception 'limite de organizações atingido' using errcode = '54000';
  end if;

  v_base := trim(both '-' from regexp_replace(
    lower(translate(p_name,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'organizacao'; end if;
  v_base := left(v_base, 48);
  v_slug := v_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.organizations (name, slug, created_by)
  values (p_name, v_slug, v_uid)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, v_uid, 'owner');

  insert into public.subscriptions (organization_id, plan_id, status)
  values (v_org.id, v_org.plan_id, 'trialing');

  -- catálogo de fontes da organização, todas começando desconectadas
  insert into public.social_connections (organization_id, source_id)
  select v_org.id, id from public.social_sources;

  perform public.log_audit(v_org.id, 'organization.created', 'organizations', v_org.id::text,
    jsonb_build_object('name', p_name));

  return v_org;
end;
$$;

-- RPC: corrigir manualmente o sentimento de uma menção (guarda histórico)
create or replace function public.correct_sentiment(p_mention uuid, p_sentiment public.sentiment_label)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_prev public.sentiment_label;
begin
  select organization_id into v_org from public.mentions where id = p_mention;
  if v_org is null or not public.can_work_org(v_org) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select sentiment into v_prev from public.sentiment_analysis
   where mention_id = p_mention order by is_manual desc, created_at desc limit 1;

  insert into public.sentiment_analysis
    (organization_id, mention_id, sentiment, confidence, model, is_manual, corrected_by, previous_sentiment)
  values (v_org, p_mention, p_sentiment, 1, 'manual', true, auth.uid(), v_prev);

  perform public.log_audit(v_org, 'mention.sentiment_corrected', 'mentions', p_mention::text,
    jsonb_build_object('from', v_prev, 'to', p_sentiment));
end;
$$;

revoke execute on function public.create_organization(text) from public, anon;
revoke execute on function public.correct_sentiment(uuid, public.sentiment_label) from public, anon;
revoke execute on function public.log_audit(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.correct_sentiment(uuid, public.sentiment_label) to authenticated;
grant execute on function public.log_audit(uuid, text, text, text, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Habilita RLS em todas as tabelas
-- -----------------------------------------------------------------------------
alter table public.plans                enable row level security;
alter table public.users                enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.monitored_profiles   enable row level security;
alter table public.search_terms         enable row level security;
alter table public.social_sources       enable row level security;
alter table public.social_connections   enable row level security;
alter table public.topics               enable row level security;
alter table public.mentions             enable row level security;
alter table public.sentiment_analysis   enable row level security;
alter table public.saved_mentions       enable row level security;
alter table public.crisis_alerts        enable row level security;
alter table public.reports              enable row level security;
alter table public.ai_recommendations   enable row level security;
alter table public.notifications        enable row level security;
alter table public.audit_logs           enable row level security;

-- Catálogos globais: leitura para autenticados
create policy plans_read on public.plans for select to authenticated using (true);
create policy sources_read on public.social_sources for select to authenticated using (true);

-- users: cada um vê a si mesmo e os colegas de organização; edita só a si mesmo
create policy users_select on public.users for select to authenticated using (
  id = auth.uid()
  or exists (
    select 1 from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and theirs.user_id = public.users.id
  )
);
create policy users_update on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.users from authenticated;
grant update (full_name, avatar_url) on public.users to authenticated;

-- organizations: membros leem; admins editam nome/retenção; owner exclui. Criação via RPC.
create policy org_select on public.organizations for select to authenticated using (public.is_org_member(id));
create policy org_update on public.organizations for update to authenticated
  using (public.can_edit_org(id)) with check (public.can_edit_org(id));
create policy org_delete on public.organizations for delete to authenticated
  using (public.has_org_role(id, array['owner']::public.member_role[]));
revoke update on public.organizations from authenticated;
grant update (name, data_retention_days) on public.organizations to authenticated;

-- organization_members: membros veem a equipe; admins mudam papéis/removem.
-- Ninguém se promove a owner por aqui; um owner não pode ser rebaixado/removido por admin.
create policy members_select on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));
create policy members_update on public.organization_members for update to authenticated
  using (public.can_edit_org(organization_id) and role <> 'owner' and user_id <> auth.uid())
  with check (public.can_edit_org(organization_id) and role <> 'owner');
create policy members_delete on public.organization_members for delete to authenticated
  using (
    (public.can_edit_org(organization_id) and role <> 'owner')
    or (user_id = auth.uid() and role <> 'owner')  -- sair da organização
  );
revoke update on public.organization_members from authenticated;
grant update (role) on public.organization_members to authenticated;

-- subscriptions: leitura para membros; escrita só pelo backend (webhook do gateway)
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_org_member(organization_id));

-- Perfis monitorados e termos: membros leem; admins gerenciam
create policy profiles_select on public.monitored_profiles for select to authenticated
  using (public.is_org_member(organization_id));
create policy profiles_insert on public.monitored_profiles for insert to authenticated
  with check (public.can_edit_org(organization_id));
create policy profiles_update on public.monitored_profiles for update to authenticated
  using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy profiles_delete on public.monitored_profiles for delete to authenticated
  using (public.can_edit_org(organization_id));

create policy terms_select on public.search_terms for select to authenticated
  using (public.is_org_member(organization_id));
create policy terms_insert on public.search_terms for insert to authenticated
  with check (public.can_edit_org(organization_id));
create policy terms_update on public.search_terms for update to authenticated
  using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy terms_delete on public.search_terms for delete to authenticated
  using (public.can_edit_org(organization_id));

-- Conexões: membros veem status; admins configuram (config não secreta / status pause)
create policy connections_select on public.social_connections for select to authenticated
  using (public.is_org_member(organization_id));
create policy connections_update on public.social_connections for update to authenticated
  using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
revoke update on public.social_connections from authenticated;
grant update (config, status) on public.social_connections to authenticated;
-- credentials_secret_id nunca é exposto ao cliente
revoke select on public.social_connections from authenticated;
grant select (id, organization_id, source_id, status, last_synced_at, mentions_found, last_error,
              config, created_at, updated_at) on public.social_connections to authenticated;

-- Assuntos
create policy topics_select on public.topics for select to authenticated
  using (public.is_org_member(organization_id));
create policy topics_write on public.topics for all to authenticated
  using (public.can_work_org(organization_id)) with check (public.can_work_org(organization_id));

-- Menções: leitura para membros; analistas mudam só status/assunto. Inserção pelo backend.
create policy mentions_select on public.mentions for select to authenticated
  using (public.is_org_member(organization_id));
create policy mentions_update on public.mentions for update to authenticated
  using (public.can_work_org(organization_id)) with check (public.can_work_org(organization_id));
revoke insert, update, delete on public.mentions from authenticated;
grant update (status, topic_id) on public.mentions to authenticated;

-- Classificações: leitura para membros; correção manual via RPC correct_sentiment
create policy sentiment_select on public.sentiment_analysis for select to authenticated
  using (public.is_org_member(organization_id));
revoke insert, update, delete on public.sentiment_analysis from authenticated;

-- Menções salvas: pessoais, dentro da organização
create policy saved_select on public.saved_mentions for select to authenticated
  using (user_id = auth.uid() and public.is_org_member(organization_id));
create policy saved_insert on public.saved_mentions for insert to authenticated
  with check (user_id = auth.uid() and public.is_org_member(organization_id));
create policy saved_delete on public.saved_mentions for delete to authenticated
  using (user_id = auth.uid());

-- Alertas: membros leem; analistas mudam status. Criação pelo backend (detector).
create policy alerts_select on public.crisis_alerts for select to authenticated
  using (public.is_org_member(organization_id));
create policy alerts_update on public.crisis_alerts for update to authenticated
  using (public.can_work_org(organization_id)) with check (public.can_work_org(organization_id));
revoke insert, update, delete on public.crisis_alerts from authenticated;
grant update (status) on public.crisis_alerts to authenticated;

-- Relatórios: autor sempre vê os seus; demais membros veem os compartilhados
create policy reports_select on public.reports for select to authenticated
  using (public.is_org_member(organization_id) and (created_by = auth.uid() or shared_with_org));
create policy reports_insert on public.reports for insert to authenticated
  with check (public.can_work_org(organization_id) and created_by = auth.uid());
create policy reports_update on public.reports for update to authenticated
  using (created_by = auth.uid() or public.can_edit_org(organization_id))
  with check (public.is_org_member(organization_id));
create policy reports_delete on public.reports for delete to authenticated
  using (created_by = auth.uid() or public.can_edit_org(organization_id));

-- Recomendações: leitura para membros; geradas pelo backend
create policy recommendations_select on public.ai_recommendations for select to authenticated
  using (public.is_org_member(organization_id));
revoke insert, update, delete on public.ai_recommendations from authenticated;

-- Notificações: cada um vê e marca as próprias como lidas
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Auditoria: leitura para owner/admin; inserção só via log_audit()
create policy audit_select on public.audit_logs for select to authenticated
  using (public.can_edit_org(organization_id));
revoke insert, update, delete on public.audit_logs from authenticated;

-- Escritas diretas em organizations/organization_members/subscriptions só via RPC/backend
revoke insert on public.organizations, public.organization_members, public.subscriptions from authenticated;
revoke update, delete on public.subscriptions from authenticated;

-- ===== migrations/20261124000300_retention.sql =====
-- =============================================================================
-- PULSO — LGPD: política de retenção
-- Remove menções (e, em cascata, classificações/salvos) mais antigas que a
-- retenção configurada na organização. Agendar com pg_cron no Supabase:
--   select cron.schedule('pulso-retencao', '17 4 * * *', 'select public.purge_expired_data()');
-- =============================================================================
create or replace function public.purge_expired_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.mentions m
  using public.organizations o
  where o.id = m.organization_id
    and m.published_at < now() - make_interval(days => o.data_retention_days);
  get diagnostics v_deleted = row_count;

  delete from public.notifications where created_at < now() - interval '180 days';
  delete from public.audit_logs where created_at < now() - interval '730 days';
  return v_deleted;
end;
$$;
revoke execute on function public.purge_expired_data() from public, anon, authenticated;

-- ===== migrations/20261125000100_fase2.sql =====
-- =============================================================================
-- PULSO — Fase 2: perfis monitorados, central de menções e análise de sentimento
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Visão de menções com a análise vigente (inclui todos os campos da IA)
-- -----------------------------------------------------------------------------
drop view if exists public.mentions_with_sentiment;
create view public.mentions_with_sentiment
with (security_invoker = true) as
select
  m.*,
  sa.sentiment,
  sa.confidence,
  sa.emotion,
  sa.stance,
  sa.is_manual as sentiment_is_manual,
  t.name as topic_name,
  sa.irony,
  sa.sarcasm,
  sa.context as analysis_context,
  sa.model as analysis_model,
  sa.created_at as analyzed_at
from public.mentions m
left join lateral (
  select s.sentiment, s.confidence, s.emotion, s.stance, s.is_manual, s.irony, s.sarcasm, s.context, s.model, s.created_at
  from public.sentiment_analysis s
  where s.mention_id = m.id
  order by s.is_manual desc, s.created_at desc
  limit 1
) sa on true
left join public.topics t on t.id = m.topic_id;

-- -----------------------------------------------------------------------------
-- Limite de perfis do plano
-- -----------------------------------------------------------------------------
create or replace function public.enforce_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  select p.max_profiles into v_max
  from public.organizations o join public.plans p on p.id = o.plan_id
  where o.id = new.organization_id;
  if v_max is null then return new; end if;
  select count(*) into v_count from public.monitored_profiles where organization_id = new.organization_id;
  if v_count >= v_max then
    raise exception 'limite do plano: até % perfil(is) monitorado(s)', v_max using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger monitored_profiles_limit before insert on public.monitored_profiles
  for each row execute function public.enforce_profile_limit();

-- -----------------------------------------------------------------------------
-- RPC: criar/editar perfil e substituir os termos numa única transação.
-- security invoker: as políticas RLS de quem chama continuam valendo.
-- p_data:  {full_name, public_name, nicknames[], office, municipality, state, party, photo_url}
-- p_terms: [{term, kind}]
-- -----------------------------------------------------------------------------
create or replace function public.save_monitored_profile(p_org uuid, p_id uuid, p_data jsonb, p_terms jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_id;
  v_nick text[];
begin
  select coalesce(array_agg(btrim(x)) filter (where btrim(x) <> ''), '{}')
    into v_nick from jsonb_array_elements_text(coalesce(p_data -> 'nicknames', '[]'::jsonb)) x;

  if v_id is null then
    insert into public.monitored_profiles
      (organization_id, full_name, public_name, nicknames, office, municipality, state, party, photo_url, created_by)
    values (
      p_org, btrim(p_data ->> 'full_name'), btrim(p_data ->> 'public_name'), v_nick,
      nullif(btrim(p_data ->> 'office'), ''), nullif(btrim(p_data ->> 'municipality'), ''),
      nullif(upper(btrim(p_data ->> 'state')), ''), nullif(btrim(p_data ->> 'party'), ''),
      nullif(p_data ->> 'photo_url', ''), auth.uid()
    )
    returning id into v_id;
  else
    update public.monitored_profiles set
      full_name = btrim(p_data ->> 'full_name'),
      public_name = btrim(p_data ->> 'public_name'),
      nicknames = v_nick,
      office = nullif(btrim(p_data ->> 'office'), ''),
      municipality = nullif(btrim(p_data ->> 'municipality'), ''),
      state = nullif(upper(btrim(p_data ->> 'state')), ''),
      party = nullif(btrim(p_data ->> 'party'), ''),
      photo_url = case when p_data ? 'photo_url' then nullif(p_data ->> 'photo_url', '') else photo_url end
    where id = v_id and organization_id = p_org;
    if not found then
      raise exception 'perfil não encontrado ou sem permissão' using errcode = '42501';
    end if;
    delete from public.search_terms where profile_id = v_id;
  end if;

  insert into public.search_terms (organization_id, profile_id, term, kind)
  select distinct p_org, v_id, btrim(t ->> 'term'), (t ->> 'kind')::public.search_term_kind
  from jsonb_array_elements(coalesce(p_terms, '[]'::jsonb)) t
  where char_length(btrim(t ->> 'term')) between 2 and 120;

  perform public.log_audit(p_org, case when p_id is null then 'profile.created' else 'profile.updated' end,
    'monitored_profiles', v_id::text, jsonb_build_object('public_name', p_data ->> 'public_name'));
  return v_id;
end;
$$;
revoke execute on function public.save_monitored_profile(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_monitored_profile(uuid, uuid, jsonb, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: registrar manualmente uma menção pública encontrada pela equipe
-- (até os conectores da Fase 3; continua útil depois para casos pontuais).
-- -----------------------------------------------------------------------------
create or replace function public.add_manual_mention(
  p_profile uuid,
  p_source text,
  p_content text,
  p_url text,
  p_author text,
  p_published_at timestamptz,
  p_content_type public.content_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select organization_id into v_org from public.monitored_profiles where id = p_profile;
  if v_org is null or not public.can_work_org(v_org) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_content, ''))) < 5 then
    raise exception 'conteúdo muito curto' using errcode = '22023';
  end if;
  if p_url is not null and p_url !~* '^https?://' then
    raise exception 'link inválido' using errcode = '22023';
  end if;
  if p_published_at > now() + interval '5 minutes' then
    raise exception 'data no futuro' using errcode = '22023';
  end if;

  insert into public.mentions
    (organization_id, profile_id, source_id, external_id, url, author_name, content, content_type, published_at, relevance)
  values
    (v_org, p_profile, p_source, 'manual:' || gen_random_uuid(), nullif(btrim(p_url), ''),
     nullif(btrim(p_author), ''), btrim(p_content), p_content_type, p_published_at, 0.5)
  returning id into v_id;

  perform public.log_audit(v_org, 'mention.manual_added', 'mentions', v_id::text, jsonb_build_object('source', p_source));
  return v_id;
end;
$$;
revoke execute on function public.add_manual_mention(uuid, text, text, text, text, timestamptz, public.content_type) from public, anon;
grant execute on function public.add_manual_mention(uuid, text, text, text, text, timestamptz, public.content_type) to authenticated;

-- -----------------------------------------------------------------------------
-- Armazenamento de fotos de perfil (bucket privado por organização: <org_id>/<arquivo>)
-- Só roda num projeto Supabase (onde o esquema storage existe).
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('profile-photos', 'profile-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
    on conflict (id) do nothing;

    execute $p$
      create policy profile_photos_read on storage.objects for select to authenticated
      using (bucket_id = 'profile-photos' and public.is_org_member(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy profile_photos_write on storage.objects for insert to authenticated
      with check (bucket_id = 'profile-photos' and public.can_edit_org(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy profile_photos_delete on storage.objects for delete to authenticated
      using (bucket_id = 'profile-photos' and public.can_edit_org(((storage.foldername(name))[1])::uuid))
    $p$;
  end if;
end $$;
