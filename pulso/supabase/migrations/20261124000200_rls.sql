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
