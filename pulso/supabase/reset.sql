-- PULSO — remove todos os objetos do PULSO (APAGA OS DADOS DO PULSO).
-- Use só durante a instalação, antes de rodar setup-completo.sql de novo.
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    drop policy if exists profile_photos_read on storage.objects;
    drop policy if exists profile_photos_write on storage.objects;
    drop policy if exists profile_photos_delete on storage.objects;
  end if;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
drop view if exists public.mentions_with_sentiment;
drop table if exists public.connection_secrets, public.sync_runs, public.audit_logs, public.notifications, public.ai_recommendations, public.reports,
  public.crisis_alerts, public.saved_mentions, public.sentiment_analysis, public.mentions, public.topics,
  public.social_connections, public.social_sources, public.search_terms, public.monitored_profiles,
  public.subscriptions, public.organization_members, public.organizations, public.users, public.plans cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.purge_expired_data() cascade;
drop function if exists public.enforce_profile_limit() cascade;
drop function if exists public.create_organization(text) cascade;
drop function if exists public.can_edit_org(uuid) cascade;
drop function if exists public.can_work_org(uuid) cascade;
drop function if exists public.is_org_member(uuid) cascade;
drop function if exists public.log_audit(uuid, text, text, text, jsonb) cascade;
drop function if exists public.save_monitored_profile(uuid, uuid, jsonb, jsonb) cascade;
drop type if exists public.member_role, public.profile_status, public.search_term_kind, public.source_category,
  public.connection_status, public.sentiment_label, public.mention_status, public.content_type, public.stance,
  public.risk_level, public.alert_status, public.report_type, public.subscription_status cascade;
