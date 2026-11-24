-- PULSO — verifica se a instalação está completa
select
  case when t.n = 18 and f.n = 13 and v.n = 1 then 'INSTALAÇÃO COMPLETA' else 'INSTALAÇÃO INCOMPLETA' end as resultado,
  t.n || ' de 18 tabelas' as tabelas,
  f.n || ' de 13 funções' as funcoes
from
  (select count(*) n from information_schema.tables where table_schema = 'public' and table_name in
    ('plans','users','organizations','organization_members','subscriptions','monitored_profiles','search_terms',
     'social_sources','social_connections','topics','mentions','sentiment_analysis','saved_mentions','crisis_alerts',
     'reports','ai_recommendations','notifications','audit_logs')) t,
  (select count(distinct proname) n from pg_proc where pronamespace = 'public'::regnamespace and proname in
    ('set_updated_at','handle_new_user','is_org_member','has_org_role','can_edit_org','can_work_org','log_audit',
     'create_organization','correct_sentiment','purge_expired_data','enforce_profile_limit','save_monitored_profile','add_manual_mention')) f,
  (select count(*) n from pg_views where schemaname = 'public' and viewname = 'mentions_with_sentiment') v;
