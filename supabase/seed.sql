-- Seed: activate questionnaire v1 (content mirrors apps/api/src/data/questionnaire_v1.json)
-- The backend serves the questionnaire from its JSON file in MVP; this row exists so the
-- database records which version each assessment was answered against.
insert into public.questionnaire_versions (version, schema, is_active)
values ('1.0.0', '{"source": "apps/api/src/data/questionnaire_v1.json"}'::jsonb, true)
on conflict (version) do update set is_active = excluded.is_active;
