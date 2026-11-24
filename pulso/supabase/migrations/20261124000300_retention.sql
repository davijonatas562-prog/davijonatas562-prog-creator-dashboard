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
