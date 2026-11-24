-- Testes de isolamento entre organizações e de permissões por papel.
-- Cada bloco falha com exception se a regra for violada.
\set ON_ERROR_STOP on

-- Usuários: Ana (org A), Bruno (org B), Carla (viewer na org A)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@exemplo.com',   '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemplo.com', '{"full_name":"Bruno"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carla@exemplo.com', '{"full_name":"Carla"}');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  execute 'set role authenticated';
end $$;

-- Ana cria a Org A; Bruno cria a Org B
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select slug from public.create_organization('Comunicação Ferreira Gomes') \gset a_
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select id as org_b from public.create_organization('Agência Norte') \gset
reset role;

select id as org_a from public.organizations where slug = :'a_slug' \gset
insert into public.organization_members values (:'org_a', '00000000-0000-0000-0000-00000000000c', 'viewer');

-- Ana cadastra um perfil
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.monitored_profiles (organization_id, full_name, public_name, office, municipality, state)
values (:'org_a', 'Alessandro Brazão', 'Prefeito Alessandro', 'Prefeito', 'Ferreira Gomes', 'AP')
returning id as profile_a \gset
reset role;

-- Backend (service role) insere uma menção + classificação
set role service_role;
insert into public.mentions (organization_id, profile_id, source_id, external_id, content, published_at)
values (:'org_a', :'profile_a', 'google_news', 'n-1', 'Notícia pública de teste', now())
returning id as mention_a \gset
insert into public.sentiment_analysis (organization_id, mention_id, sentiment, confidence, model)
values (:'org_a', :'mention_a', 'neutral', 0.8, 'teste');
reset role;

do $$ begin raise notice 'setup ok'; end $$;

-- 1) Bruno não vê nada da Org A
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.organizations) <> 1 then raise exception 'FALHA: Bruno vê outra organização'; end if;
  if (select count(*) from public.monitored_profiles) <> 0 then raise exception 'FALHA: Bruno vê perfis da Org A'; end if;
  if (select count(*) from public.mentions) <> 0 then raise exception 'FALHA: Bruno vê menções da Org A'; end if;
  if (select count(*) from public.mentions_with_sentiment) <> 0 then raise exception 'FALHA: view vaza menções'; end if;
  if (select count(*) from public.users) <> 1 then raise exception 'FALHA: Bruno vê usuários de outra org'; end if;
  if (select count(*) from public.social_connections) <> 11 then raise exception 'FALHA: Bruno deveria ver só as 11 conexões dele'; end if;
  raise notice 'ok 1: isolamento entre organizações';
end $$;

-- 2) Bruno não consegue inserir perfil na Org A, nem se adicionar como membro
\set ON_ERROR_STOP off
insert into public.monitored_profiles (organization_id, full_name, public_name) values (:'org_a', 'Invasor', 'Invasor');
insert into public.organization_members values (:'org_a', '00000000-0000-0000-0000-00000000000b', 'owner');
update public.mentions set status = 'ignored' where id = :'mention_a';
select public.correct_sentiment(:'mention_a', 'negative');
\set ON_ERROR_STOP on
reset role;
do $$ begin
  if exists (select 1 from public.monitored_profiles where full_name = 'Invasor') then raise exception 'FALHA: insert cruzado'; end if;
  if exists (select 1 from public.organization_members where user_id = '00000000-0000-0000-0000-00000000000b'
             and organization_id <> (select id from public.organizations where slug = 'agencia-norte')) then
    raise exception 'FALHA: auto-inclusão em outra org'; end if;
  if (select status from public.mentions limit 1) <> 'new' then raise exception 'FALHA: update cruzado em menção'; end if;
  if (select count(*) from public.sentiment_analysis) <> 1 then raise exception 'FALHA: correção cruzada'; end if;
  raise notice 'ok 2: escrita cruzada bloqueada';
end $$;

-- 3) Carla (viewer) lê, mas não escreve
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  if (select count(*) from public.mentions_with_sentiment) <> 1 then raise exception 'FALHA: viewer deveria ler menções'; end if;
  if (select count(*) from public.audit_logs) <> 0 then raise exception 'FALHA: viewer não deveria ler auditoria'; end if;
  raise notice 'ok 3a: viewer lê dados da org';
end $$;
\set ON_ERROR_STOP off
update public.monitored_profiles set public_name = 'Hackeado';
select public.correct_sentiment(:'mention_a', 'negative');
update public.organization_members set role = 'admin' where user_id = auth.uid();
\set ON_ERROR_STOP on
reset role;
do $$ begin
  if exists (select 1 from public.monitored_profiles where public_name = 'Hackeado') then raise exception 'FALHA: viewer editou perfil'; end if;
  if (select role from public.organization_members where user_id = '00000000-0000-0000-0000-00000000000c') <> 'viewer' then
    raise exception 'FALHA: viewer se promoveu'; end if;
  raise notice 'ok 3b: viewer não escreve';
end $$;

-- 4) Ana (owner) corrige sentimento e muda status; vê auditoria
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.correct_sentiment(:'mention_a', 'positive');
update public.mentions set status = 'in_review' where id = :'mention_a';
do $$ begin
  if (select sentiment from public.mentions_with_sentiment limit 1) <> 'positive' then raise exception 'FALHA: correção manual não prevalece'; end if;
  if (select status from public.mentions limit 1) <> 'in_review' then raise exception 'FALHA: owner não mudou status'; end if;
  if (select count(*) from public.audit_logs) < 2 then raise exception 'FALHA: auditoria não registrada'; end if;
  raise notice 'ok 4: owner trabalha menções e lê auditoria';
end $$;
\set ON_ERROR_STOP off
-- owner não pode mudar o conteúdo da menção (só status/assunto)
update public.mentions set content = 'adulterado' where id = :'mention_a';
-- ninguém insere direto em organizations
insert into public.organizations (name, slug) values ('Direta', 'direta');
\set ON_ERROR_STOP on
reset role;
do $$ begin
  if (select content from public.mentions limit 1) = 'adulterado' then raise exception 'FALHA: conteúdo da menção alterado'; end if;
  if exists (select 1 from public.organizations where slug = 'direta') then raise exception 'FALHA: insert direto em organizations'; end if;
  raise notice 'ok 5: colunas protegidas e criação só via RPC';
end $$;

-- 6) anon não lê nada
set role anon;
\set ON_ERROR_STOP off
select count(*) from public.mentions;
select count(*) from public.plans;
\set ON_ERROR_STOP on
reset role;

-- 7) retenção
update public.organizations set data_retention_days = 30;
update public.mentions set published_at = now() - interval '40 days';
do $$ begin
  if public.purge_expired_data() <> 1 then raise exception 'FALHA: retenção não removeu'; end if;
  raise notice 'ok 7: retenção';
end $$;


-- 8) Fase 2: perfis com termos (RPC), limite do plano, menção manual
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.save_monitored_profile(:'org_a', :'profile_a',
  '{"full_name":"Alessandro Brazão","public_name":"Prefeito Alessandro","nicknames":["Brazão"],"office":"Prefeito","municipality":"Ferreira Gomes","state":"ap"}',
  '[{"term":"Alessandro Brazão","kind":"primary"},{"term":"Ferreira Gomes","kind":"context"},{"term":"Alessandro Silva","kind":"exclude"}]');
select public.add_manual_mention(:'profile_a', 'instagram', 'Comentário público sobre a prefeitura', 'https://instagram.com/p/x', 'Perfil público', now() - interval '1 hour', 'comment') as manual_id \gset
\set ON_ERROR_STOP off
-- plano Essencial permite 1 perfil: o segundo deve falhar
select public.save_monitored_profile(:'org_a', null, '{"full_name":"Outro Nome","public_name":"Outro"}', '[]');
-- link inválido
select public.add_manual_mention(:'profile_a', 'instagram', 'Texto qualquer aqui', 'javascript:alert(1)', null, now(), 'post');
\set ON_ERROR_STOP on
reset role;
do $$ begin
  if (select count(*) from public.search_terms) <> 3 then raise exception 'FALHA: termos não salvos'; end if;
  if (select state from public.monitored_profiles limit 1) <> 'AP' then raise exception 'FALHA: UF não normalizada'; end if;
  if (select count(*) from public.monitored_profiles) <> 1 then raise exception 'FALHA: limite do plano não aplicado'; end if;
  if (select count(*) from public.mentions where external_id like 'manual:%') <> 1 then raise exception 'FALHA: menção manual'; end if;
  raise notice 'ok 8: perfil + termos atômicos, limite do plano, menção manual validada';
end $$;

-- 9) Bruno e Carla não usam as RPCs da Fase 2 na Org A
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
\set ON_ERROR_STOP off
select public.save_monitored_profile(:'org_a', :'profile_a', '{"full_name":"Invadido","public_name":"Invadido"}', '[]');
select public.add_manual_mention(:'profile_a', 'x', 'Menção injetada por outra org', null, null, now(), 'post');
\set ON_ERROR_STOP on
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
\set ON_ERROR_STOP off
select public.add_manual_mention(:'profile_a', 'x', 'Viewer tentando inserir', null, null, now(), 'post');
\set ON_ERROR_STOP on
reset role;
do $$ begin
  if exists (select 1 from public.monitored_profiles where public_name = 'Invadido') then raise exception 'FALHA: edição cruzada de perfil'; end if;
  if (select count(*) from public.search_terms) <> 3 then raise exception 'FALHA: termos apagados por outra org'; end if;
  if (select count(*) from public.mentions where external_id like 'manual:%') <> 1 then raise exception 'FALHA: menção manual indevida'; end if;
  raise notice 'ok 9: RPCs da Fase 2 respeitam organização e papel';
end $$;

do $$ begin raise notice 'TODOS OS TESTES PASSARAM'; end $$;
