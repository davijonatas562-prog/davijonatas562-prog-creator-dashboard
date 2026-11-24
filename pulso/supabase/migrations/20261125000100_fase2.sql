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
